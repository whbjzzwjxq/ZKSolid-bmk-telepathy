import {
    ConsensusClient,
    poseidonSyncCommittee,
    toLittleEndianFromBigInt
} from '@succinctlabs/telepathy-sdk';
import { toHexString } from '@chainsafe/ssz';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import fs from 'fs';
import toml from 'toml';
import { exec } from 'node:child_process';

async function deployTelepathy(privateKey: string, source: string, target: string) {
    const chains = toml.parse(fs.readFileSync('./config.toml').toString());

    const sourceChain = chains[source];
    const targetChain = chains[target];

    const client = new ConsensusClient(sourceChain.consensusRpcUrl);
    const update = await client.getTelepathyUpdate('finalized');
    const genesis = await client.getGenesis();
    const poseidon = await poseidonSyncCommittee(update.currentSyncCommittee.pubkeys);
    const genesisValidatorsRoot = toHexString(update.genesisValidatorsRoot);
    const genesisTime = genesis.genesisTime;
    const secondsPerSlot = 12;
    const syncCommitteePeriod = Math.floor(Math.floor(update.attestedHeader.slot / 32) / 256);
    const syncCommitteePoseidon = toHexString(toLittleEndianFromBigInt(poseidon));

    const vars = [
        `GENESIS_VALIDATORS_ROOT=${genesisValidatorsRoot}`,
        `GENESIS_TIME=${genesisTime}`,
        `SECONDS_PER_SLOT=${secondsPerSlot}`,
        `SYNC_COMMITTEE_PERIOD=${syncCommitteePeriod}`,
        `SYNC_COMMITTEE_POSEIDON=${syncCommitteePoseidon}`
    ];

    const cmd = `cd ../contracts/script && \
        echo '${vars.join('\n')}' > .env && \
        forge script LightClient.s.sol:Deploy \
        --rpc-url ${targetChain.executionRpcUrl} \
        --chain-id ${targetChain.chainId} \
        --private-key ${privateKey} \
        --verify \
        --broadcast \
        --etherscan-api-key ${targetChain.etherscanApiKey} \
        -vvvv`;

    const result = exec(cmd);
    if (result.stdout != undefined) {
        result.stdout.on('data', (data) => {
            console.log(data);
        });
    }
    if (result.stderr != undefined) {
        result.stderr.on('data', (data) => {
            console.error(data);
        });
    }
    result.on('close', (code) => {
        console.log(`child process exited with code ${code}`);
    });
}

function main() {
    const y = yargs();

    y.command({
        command: 'deploy',
        describe: 'Deploy telepathy for a source chain to a target chain.',
        builder: {
            privateKey: {
                describe: 'the private key to send transactions from',
                demandOption: true,
                type: 'string'
            },
            source: {
                describe: 'the chain providing consensus info',
                demandOption: true,
                type: 'string'
            },
            target: {
                describe: 'the chain telepathy will be deployed on',
                demandOption: true,
                type: 'string'
            }
        },
        handler(argv: any) {
            deployTelepathy(argv.privateKey, argv.source, argv.target);
        }
    });

    y.parse(hideBin(process.argv));
}

main();
