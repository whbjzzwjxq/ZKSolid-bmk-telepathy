import {
    CircuitConfig,
    poseidonSyncCommittee,
    RotateCircuit,
    StepCircuit,
    hashBeaconBlockHeader,
    toLittleEndianFromBigInt,
    ConsensusClient,
    TelepathyUpdate,
    computeBitSum,
    hashSyncCommittee
} from '@succinctlabs/telepathy-sdk';
import { toHexString } from '@chainsafe/ssz';
import { BigNumber } from 'ethers';
import {
    LightClient,
    LightClientRotateStruct,
    LightClientStepStruct
} from './types/ethers-contracts/LightClient';
import { toGroth16ProofFromCircomProof } from './helper';
import { LightClient__factory } from './types/ethers-contracts';
import { ethers } from 'ethers';
import config from 'dotenv';
import pino from 'pino';
import toml from 'toml';
import fs from 'fs';
import axios from 'axios';

const logger = pino();
config.config({ path: '../.env' });
const SECONDS = 1000;

const SLOTS_PER_EPOCH = 32;
const EPOCHS_PER_PERIOD = 256;
const SLOTS_PER_PERIOD = SLOTS_PER_EPOCH * EPOCHS_PER_PERIOD;
const EMPTY_BYTES32 = '0x0000000000000000000000000000000000000000000000000000000000000000';

type TargetConfig = {
    name: string;
    address: string;
    chainId: number;
    executionRpcUrl: string;
};

type OperatorConfig = {
    client: ConsensusClient;
    stepCircuit: StepCircuit;
    rotateCircuit: RotateCircuit;
    targets: LightClient[];
    targetConfigs: TargetConfig[];
    stepInterval: number;
    rotateInterval: number;
};

async function getExtraOptions(chainId: number) {
    const extraOptions: {
        maxFeePerGas?: BigNumber;
        maxPriorityFeePerGas?: BigNumber;
        gasLimit?: BigNumber;
    } = {};
    if (chainId == 137) {
        let maxFeePerGas = ethers.BigNumber.from(40000000000);
        let maxPriorityFeePerGas = ethers.BigNumber.from(40000000000);
        try {
            const { data } = await axios.get('https://gasstation-mainnet.matic.network/v2');
            maxFeePerGas = ethers.utils.parseUnits(Math.ceil(data.fast.maxFee) + '', 'gwei');
            maxPriorityFeePerGas = ethers.utils.parseUnits(
                Math.ceil(data.fast.maxPriorityFee) + '',
                'gwei'
            );
        } catch {
            // ignore
        }
        extraOptions.maxFeePerGas = maxFeePerGas;
        extraOptions.maxPriorityFeePerGas = maxPriorityFeePerGas;
    } else {
        return {
            gasLimit: BigNumber.from(2000000)
        };
    }
    return extraOptions;
}

class Operator {
    client: ConsensusClient;
    stepCircuit: StepCircuit;
    rotateCircuit: RotateCircuit;
    targets: LightClient[];
    targetConfigs: TargetConfig[];
    stepInterval: number;
    rotateInterval: number;

    constructor(config: OperatorConfig) {
        this.client = config.client;
        this.stepCircuit = config.stepCircuit;
        this.rotateCircuit = config.rotateCircuit;
        this.targets = config.targets;
        this.targetConfigs = config.targetConfigs;
        this.stepInterval = config.stepInterval;
        this.rotateInterval = config.rotateInterval;
    }

    async start() {
        await this.sync();
        await this.loop();
        setInterval(async () => {
            await this.loop();
        }, this.stepInterval * SECONDS);
    }

    /** Syncs all light clients to contain the current sync committee (not next) */
    async sync() {
        logger.info('Syncing all light clients to contain the current sync committee');
        const latestHead = await this.client.getHeader('finalized');
        const latestPeriod = Math.floor(latestHead.slot / SLOTS_PER_PERIOD);
        logger.info('Current sync committee period: ' + latestPeriod);

        let oldestPeriod = Number.MAX_SAFE_INTEGER;
        for (let i = 0; i < this.targets.length; i++) {
            const name = this.targetConfigs[i].name;
            const target = this.targets[i];
            const head = await target.head().then((x) => Number(x));
            const lowerBoundPeriod = Math.floor(head / SLOTS_PER_PERIOD) + 1;
            let currentPeriod = lowerBoundPeriod;
            for (let i = lowerBoundPeriod; i <= latestPeriod; i++) {
                const syncCommittee = await target.syncCommitteePoseidons(i);
                if (syncCommittee != EMPTY_BYTES32) {
                    currentPeriod = i;
                } else {
                    break;
                }
            }
            oldestPeriod = currentPeriod < oldestPeriod ? currentPeriod : oldestPeriod;
            logger.info(`${name} has sync committee up to period ${currentPeriod}`);
        }
        logger.info('Found oldest sync committee to be at period ' + oldestPeriod);

        for (let period = oldestPeriod; period < latestPeriod; period++) {
            logger.info('Syncing all light clients to contain sync committee for period ' + period);
            const data = await this.client.getFinalizedTelepathyUpdateInPeriod(period);
            if (data === undefined) {
                throw Error('No finalized updates in the entire period');
            }
            await this.rotate(data);
        }
    }

    /** Stateless loop that runs every six minutes to step and rotate the light clients as needed */
    async loop() {
        logger.info('Getting telepathy update from consensus client...');
        const data = await this.client.getTelepathyUpdate('finalized');
        if (3 * Number(computeBitSum(data.syncAggregate.syncCommitteeBits)) <= 2 * 512) {
            logger.info('Skipping loop because there is not enough participation');
            return;
        }
        logger.info('Finished.');

        let rotate = false;
        const nextPeriod = BigNumber.from(Math.floor(data.attestedHeader.slot / (32 * 256)) + 1);
        for (let i = 0; i < this.targets.length; i++) {
            const target = this.targets[i];
            const nextSyncCommittee = await target.syncCommitteePoseidons(nextPeriod);
            if (nextSyncCommittee == EMPTY_BYTES32) {
                rotate = true;
                break;
            }
        }

        await this.step(data);
        if (rotate) {
            await this.rotate(data);
        }
    }

    async step(data: TelepathyUpdate) {
        logger.info('Creating step update...');
        const step = await this.createStepUpdate(data);
        logger.info('Finished.');

        if (3 * Number(computeBitSum(data.syncAggregate.syncCommitteeBits)) > 2 * 512) {
            logger.info('Sending step update to all light clients...');
            const receipts = await this.sendStepUpdate(step);
            for (let i = 0; i < receipts.length; i++) {
                const receipt = receipts[i];
                if (receipt != undefined) {
                    receipt.then((x) => {
                        logger.info(
                            `Sent step update to ${this.targetConfigs[i].name} with tx ${x.transactionHash} and status ${x.status}`
                        );
                    });
                }
            }
            logger.info('Finished sending step update to all light clients');
        }
    }

    async rotate(data: TelepathyUpdate) {
        logger.info('Creating rotate update...');
        const rotate = await this.createRotateUpdate(data);
        logger.info('Finished.');

        logger.info('Sending rotate update to all light clients...');
        const receipts = await this.sendRotateUpdate(rotate);
        for (let i = 0; i < receipts.length; i++) {
            const receipt = receipts[i];
            console.log('receipt', receipt);
            if (receipt != undefined) {
                receipt.then((x) => {
                    logger.info(
                        `Sent rotate update to ${this.targetConfigs[i].name} with tx ${x.transactionHash} and status ${x.status}`
                    );
                });
            }
        }
        logger.info('Finished sending rotate update to all light clients');
    }

    async createStepUpdate(update: TelepathyUpdate) {
        logger.info('Calculating inputs for step...');
        const inputs = await this.stepCircuit.calculateInputs(update);
        logger.info('Calculating witness for step...');
        const witness = await this.stepCircuit.calculateWitness(inputs);
        logger.info('Generating proof for step...');
        const proofAndPublicInputs = await this.stepCircuit.prove(witness);

        const tx = {
            finalizedSlot: BigNumber.from(update.finalizedHeader.slot),
            participation: BigNumber.from(computeBitSum(update.syncAggregate.syncCommitteeBits)),
            finalizedHeaderRoot: toHexString(hashBeaconBlockHeader(update.finalizedHeader)),
            executionStateRoot: toHexString(update.executionStateRoot),
            proof: toGroth16ProofFromCircomProof(proofAndPublicInputs.proof)
        } as LightClientStepStruct;
        fs.writeFileSync(`./data/step_${tx.finalizedSlot}.json`, JSON.stringify(tx));
        return tx;
    }

    async createRotateUpdate(update: TelepathyUpdate) {
        logger.info('Calculating inputs for rotate...');
        const inputs = await this.rotateCircuit.calculateInputs(update);
        logger.info('Calculating witness for rotate...');
        const witness = await this.rotateCircuit.calculateWitness(inputs);
        logger.info('Generating proof for rotate...');
        const proofAndPublicInputs = await this.rotateCircuit.prove(witness);

        const stepUpdate = await this.createStepUpdate(update);
        const syncCommitteePoseidon = await poseidonSyncCommittee(update.nextSyncCommittee.pubkeys);

        const tx = {
            step: stepUpdate,
            syncCommitteeSSZ: toHexString(hashSyncCommittee(update.nextSyncCommittee)),
            syncCommitteePoseidon: toHexString(toLittleEndianFromBigInt(syncCommitteePoseidon)),
            proof: toGroth16ProofFromCircomProof(proofAndPublicInputs.proof)
        } as LightClientRotateStruct;
        fs.writeFileSync(`./data/rotate_${tx.step.finalizedSlot}.json`, JSON.stringify(tx));
        return tx;
    }

    async sendStepUpdate(update: LightClientStepStruct) {
        const receipts = [];
        for (let i = 0; i < this.targets.length; i++) {
            const extraOptions = await getExtraOptions(this.targetConfigs[i].chainId);
            logger.info('Sending step update to ' + this.targetConfigs[i].name);
            try {
                const tx = await this.targets[i].step(update, extraOptions);
                const receipt = tx.wait();
                receipts.push(receipt);
            } catch (err) {
                console.log(err);
                receipts.push(undefined);
            }
        }
        return receipts;
    }

    async sendRotateUpdate(update: LightClientRotateStruct) {
        logger.info('Sending rotate update to compatible light clients');
        const receipts = [];
        for (let i = 0; i < this.targets.length; i++) {
            const nextPeriod = Math.floor(Number(update.step.finalizedSlot) / (256 * 32)) + 1;
            const nextSyncCommittee = await this.targets[i].syncCommitteePoseidons(nextPeriod);
            if (nextSyncCommittee == EMPTY_BYTES32) {
                const extraOptions = await getExtraOptions(this.targetConfigs[i].chainId);
                logger.info('Sending rotate update to ' + this.targetConfigs[i].name);
                try {
                    const tx = await this.targets[i].rotate(update, extraOptions);
                    const receipt = tx.wait();
                    receipts.push(receipt);
                } catch (err) {
                    console.log(err);
                    receipts.push(undefined);
                }
            } else {
                receipts.push(undefined);
            }
        }
        console.log('exited');
        return receipts;
    }
}

async function main() {
    const config = toml.parse(fs.readFileSync('./config.toml').toString());
    const client = new ConsensusClient(config.consensusRpcUrl);
    logger.info('Connected to consensus client at ' + config.consensusRpcUrl);

    const stepConfig: CircuitConfig = {
        witnessExecutablePath: config.step.witnessExecutablePath,
        proverExecutablePath: config.step.proverExecutablePath,
        proverKeyPath: config.step.proverKeyPath
    };
    const stepCircuit = new StepCircuit(stepConfig);
    logger.info('Initialized step circuit successfully');

    const rotateConfig: CircuitConfig = {
        witnessExecutablePath: config.rotate.witnessExecutablePath,
        proverExecutablePath: config.rotate.proverExecutablePath,
        proverKeyPath: config.rotate.proverKeyPath
    };
    const rotateCircuit = new RotateCircuit(rotateConfig);
    logger.info('Initialized rotate circuit successfully');

    const targets = [];
    const targetConfigs = [];
    const privateKey = process.env.PRIVATE_KEY ?? '';
    for (let i = 0; i < config.target.length; i++) {
        const targetConfig = config.target[i] as TargetConfig;
        const provider = new ethers.providers.JsonRpcProvider(targetConfig.executionRpcUrl);
        const wallet = new ethers.Wallet(privateKey, provider);
        const target = LightClient__factory.connect(targetConfig.address, wallet);
        targets.push(target);
        targetConfigs.push(targetConfig);
        logger.info('Connected to ' + targetConfig.name);
    }

    const operatorConfig: OperatorConfig = {
        client,
        stepCircuit,
        rotateCircuit,
        targets,
        targetConfigs,
        stepInterval: config.stepInterval,
        rotateInterval: config.rotateInterval
    };
    const operator = new Operator(operatorConfig);
    logger.info('Starting operator...');
    await operator.start();
}

main();
