/**
 * This is a mock operator that is useful for testing the relayer.
 */

import {
    Contracts,
    LightClientMock,
    ContractTypeEnum
} from '@succinctlabs/telepathy-sdk/contracts';
import { commonSetup } from '@succinctlabs/telepathy-sdk/devops';
import { ConsensusClient } from '@succinctlabs/telepathy-sdk';
import { RelayerConfig } from './relayer';
import winston from 'winston';
import { ssz } from '@lodestar/types';

export class MockOperator {
    config: RelayerConfig;
    contracts: Contracts;
    logger: winston.Logger;
    consensusClient: ConsensusClient;

    constructor(config: RelayerConfig) {
        this.config = config;
        this.contracts = new Contracts();
        this.initializeContracts();
        this.consensusClient = new ConsensusClient(config.sourceChainConsensusRpc);
        this.logger = commonSetup().logger;
    }

    /** Initializes contracts from the relayer configuration */
    initializeContracts() {
        for (const destinationChainConfig of this.config.destinationChains) {
            this.contracts.addSigner(
                destinationChainConfig.chainId,
                destinationChainConfig.privateKey,
                destinationChainConfig.rpc
            );
            this.contracts.addContract(
                destinationChainConfig.chainId,
                destinationChainConfig.beaconLightClientAddress,
                ContractTypeEnum.LightClientMock,
                true // requireSigner
            );
        }
    }

    sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

    async getHeadBlock() {
        // Sometimes the head slot is a missed slot, so we need might need to try again
        // to get a valid head
        while (true) {
            try {
                const latestBlock = await this.consensusClient.getBlock('head');
                if (latestBlock) {
                    return latestBlock;
                }
            } catch (e) {
                // this.logger.error(e);
            }
        }
    }

    /** For all contracts, starts the relevant watcher */
    async start() {
        // Get the latest slot, then get latest block, then get state root for block
        while (true) {
            const latestBlock = await this.getHeadBlock();
            const latestSlot = latestBlock.slot;
            this.logger.info('Latest slot: ' + latestSlot);
            const executionStateRoot = latestBlock.body.executionPayload.stateRoot;
            const latestHeader = await this.consensusClient.getHeader(latestSlot);
            const latestHeaderRoot = ssz.phase0.BeaconBlockHeader.hashTreeRoot(latestHeader);
            for (const destChainConfig of this.config.destinationChains) {
                const destChainId = destChainConfig.chainId;
                const lightClient = this.contracts.getContract(
                    destChainId,
                    ContractTypeEnum.LightClientMock
                ) as LightClientMock;

                const extraOptions = await this.contracts.getExtraOptions(destChainId);
                const executeTx = await lightClient.setExecutionRoot(
                    latestSlot,
                    executionStateRoot,
                    extraOptions
                );
                const receipt = await executeTx.wait();
                this.logger.info(
                    `Sent mock operator update transaction for execution root on ${destChainId}, txHash ${JSON.stringify(
                        receipt.transactionHash
                    )}`
                );
                const stateRootTx = await lightClient.setHeader(
                    latestSlot,
                    latestHeaderRoot,
                    extraOptions
                );
                const receiptStateRoot = await stateRootTx.wait();
                this.logger.info(
                    `Sent mock operator update transaction for header root on ${destChainId}, txHash ${JSON.stringify(
                        receiptStateRoot.transactionHash
                    )}`
                );
            }
            await this.sleep(60 * 1000); // Every 60 seconds
        }
    }
}
