import axios from 'axios';
import { AxiosInstance } from 'axios';
import { toHexString } from '@chainsafe/ssz';
import { altair, bellatrix, phase0, ssz } from '@lodestar/types';
import { ProofType, createProof, SingleProof } from '@chainsafe/persistent-merkle-tree';
import { UnparsedResponse } from './utils';
import { hashPair } from './ssz';

const ROUTES = {
    getBlock: '/eth/v2/beacon/blocks/{block_id}',
    getGenesis: '/eth/v1/beacon/genesis',
    getHeader: '/eth/v1/beacon/headers/{block_id}',
    getFinalityUpdate: '/eth/v1/beacon/light_client/finality_update',
    getUpdates: '/eth/v1/beacon/light_client/updates',
    getBeaconState: '/eth/v2/debug/beacon/states/{state_id}'
};

/** Can be a slot, a hexstring, or 'head' / 'finalized' / 'justified' / etc */
export type BeaconId = number | Uint8Array | string;
export type TelepathyUpdate = {
    attestedHeader: phase0.BeaconBlockHeader;
    currentSyncCommittee: altair.SyncCommittee;
    nextSyncCommittee: altair.SyncCommittee;
    nextSyncCommitteeBranch: Uint8Array[];
    finalizedHeader: phase0.BeaconBlockHeader;
    finalityBranch: Uint8Array[];
    syncAggregate: altair.SyncAggregate;
    forkData: phase0.ForkData;
};

/**
 * Connects to an Ethereum 2.0 Beacon Node and exposes methods to query and access data about
 * the chain.
 */
export class ConsensusClient {
    consensusRpc: string;
    client: AxiosInstance;

    constructor(consensusRpc: string) {
        this.consensusRpc = consensusRpc;
        this.client = axios.create({
            baseURL: this.consensusRpc,
            responseType: 'json',
            headers: { 'Content-Type': 'application/json' }
        });
    }

    toStringFromBeaconId(identifier: BeaconId) {
        if (identifier instanceof Uint8Array) {
            return toHexString(identifier);
        }
        return identifier.toString();
    }

    async getState(stateIdentifier: BeaconId): Promise<bellatrix.BeaconState> {
        const id = this.toStringFromBeaconId(stateIdentifier);
        const response = await this.client.get(ROUTES.getBeaconState.replace('{state_id}', id));
        const state = ssz.bellatrix.BeaconState.fromJson(
            response.data.data
        ) as bellatrix.BeaconState;
        return state;
    }

    async getBlock(blockIdentifier: BeaconId): Promise<bellatrix.BeaconBlock> {
        const id = this.toStringFromBeaconId(blockIdentifier);
        const response = await this.client.get(ROUTES.getBlock.replace('{block_id}', id));
        const block = ssz.bellatrix.BeaconBlock.fromJson(
            response.data.data.message
        ) as bellatrix.BeaconBlock;
        return block;
    }

    async getHeader(blockIdentifier: BeaconId): Promise<phase0.BeaconBlockHeader> {
        const id = this.toStringFromBeaconId(blockIdentifier);
        const response = await this.client.get(ROUTES.getHeader.replace('{block_id}', id));
        const header = ssz.phase0.BeaconBlockHeader.fromJson(response.data.data.header.message);
        return header;
    }

    async getTelepathyUpdate(blockIdentifier: BeaconId): Promise<TelepathyUpdate> {
        const attestedHeader = await this.getHeader(blockIdentifier);
        const attestedBlock = await this.getBlock(blockIdentifier);
        const attestedBody = attestedBlock.body;
        const attestedState = await this.getState(attestedHeader.stateRoot);
        const attesedStateView = ssz.bellatrix.BeaconState.toView(attestedState);

        const finalizedHeader = await this.getHeader(attestedState.finalizedCheckpoint.root);
        const finalizedState = await this.getState(finalizedHeader.stateRoot);
        const finalizedStateView = ssz.bellatrix.BeaconState.toView(finalizedState);

        const currentSyncCommittee = attestedState.currentSyncCommittee;
        const nextSyncCommitteeIndex = ssz.bellatrix.BeaconState.getPathInfo([
            'next_sync_committee'
        ]).gindex;
        const nextSyncCommittee = finalizedState.nextSyncCommittee;
        const nextSyncCommitteeBranch = (
            createProof(finalizedStateView.node, {
                type: ProofType.single,
                gindex: nextSyncCommitteeIndex
            }) as SingleProof
        ).witnesses;

        const finalityBranchIndex = ssz.bellatrix.BeaconState.getPathInfo([
            'finalized_checkpoint',
            'root'
        ]).gindex;
        const finalityBranch = (
            createProof(attesedStateView.node, {
                type: ProofType.single,
                gindex: finalityBranchIndex
            }) as SingleProof
        ).witnesses;

        const syncAggregate = attestedBody.syncAggregate;
        const genesisValidatorsRoot = attestedState.genesisValidatorsRoot;
        const currentVersion = attestedState.fork.currentVersion;
        const forkData = { genesisValidatorsRoot, currentVersion } as phase0.ForkData;

        const paddedVersion = new Uint8Array(32);
        for (let i = 0; i < 4; i++) {
            paddedVersion[i] = currentVersion[i];
        }

        return {
            attestedHeader,
            currentSyncCommittee,
            nextSyncCommittee,
            nextSyncCommitteeBranch,
            finalizedHeader,
            finalityBranch,
            syncAggregate,
            forkData
        };
    }

    async getExecutionStateRootProof(blockIdentifier: BeaconId) {
        const id = this.toStringFromBeaconId(blockIdentifier);
        const block = await this.getBlock(id);
        const view = ssz.bellatrix.BeaconBlockBody.toView(block.body as bellatrix.BeaconBlockBody);
        const proof = createProof(view.node, {
            type: ProofType.single,
            gindex: BigInt(402)
        }) as SingleProof;
        return {
            executionStateRoot: proof.leaf,
            executionStateProof: proof.witnesses
        };
    }

    async getFinalityUpdate(): Promise<altair.LightClientFinalityUpdate> {
        const response = await this.client.get(ROUTES.getFinalityUpdate);
        const finalityUpdate = ssz.altair.LightClientFinalityUpdate.fromJson(
            response.data.data
        ) as altair.LightClientFinalityUpdate;
        return finalityUpdate;
    }

    async getUpdates(period: number, count: number): Promise<altair.LightClientUpdate[]> {
        const response = await this.client.get(ROUTES.getUpdates, {
            params: {
                start_period: period,
                count: count
            }
        });

        if (response.data.length !== count) {
            throw Error(`Expected ${count} updates, got ${response.data.length} `);
        }

        return response.data.map((update: UnparsedResponse) => {
            return ssz.altair.LightClientUpdate.fromJson(update.data) as altair.LightClientUpdate;
        });
    }

    async getGenesis(): Promise<phase0.Genesis> {
        const response = await this.client.get(ROUTES.getGenesis);
        return ssz.phase0.Genesis.fromJson(response.data.data);
    }
}
