import * as ssz from '../consensus/ssz';
import { CircomInput, CircomSerializer, stringifyCircomInput } from './serializer';
import { ConsensusClient, TelepathyUpdate } from '../consensus/client';
import { poseidonSyncCommittee } from './poseidon';
import { Circuit } from './circuit';

export class StepCircuit extends Circuit {
    async calculateInputs(
        update: TelepathyUpdate,
        executionStateRoot: Uint8Array,
        executionStateProof: Uint8Array[]
    ): Promise<CircomInput> {
        const attestedHeader = update.attestedHeader;
        const attestedHeaderRoot = ssz.hashBeaconBlockHeader(attestedHeader);

        const finalizedHeader = update.finalizedHeader;
        const finalizedHeaderRoot = ssz.hashBeaconBlockHeader(finalizedHeader);
        const finalityBranch = update.finalityBranch;

        const pubkeys = update.currentSyncCommittee.pubkeys;
        const syncAggregate = update.syncAggregate;
        const domain = ssz.computeDomain(
            update.forkData.currentVersion,
            update.forkData.genesisValidatorsRoot
        );
        const signingRoot = ssz.hashPair(attestedHeaderRoot, domain);
        const syncCommitteePoseidon = await poseidonSyncCommittee(
            update.currentSyncCommittee.pubkeys
        );

        const participation = ssz.computeBitSum(syncAggregate.syncCommitteeBits);
        const sha0 = ssz.hashPair(ssz.toLittleEndian(finalizedHeader.slot), finalizedHeaderRoot);
        const sha1 = ssz.hashPair(sha0, ssz.toLittleEndian(Number(participation)));
        const sha2 = ssz.hashPair(sha1, executionStateRoot);
        const sha3 = ssz.hashPair(sha2, ssz.toLittleEndianFromBigInt(syncCommitteePoseidon));
        const publicInputsRoot = ssz.toBigIntFromBytes32(sha3) & ssz.get253BitMask();

        const cs = new CircomSerializer();
        cs.writeBytes32('attestedHeaderRoot', attestedHeaderRoot);
        cs.writeBeaconBlockHeader('attested', attestedHeader);
        cs.writeBytes32('finalizedHeaderRoot', finalizedHeaderRoot);
        cs.writeBeaconBlockHeader('finalized', finalizedHeader);

        cs.writeG1PointsAsBigInt('pubkeys', pubkeys);
        cs.writeBitArray('aggregationBits', syncAggregate.syncCommitteeBits);
        cs.writeG2Point('signature', syncAggregate.syncCommitteeSignature);
        cs.writeBytes32('domain', domain);
        cs.writeBytes32('signingRoot', signingRoot);
        cs.writeBigInt('participation', participation);
        cs.writeBigInt('syncCommitteePoseidon', syncCommitteePoseidon);

        cs.writeMerkleBranch('finalityBranch', finalityBranch);
        cs.writeBytes32('executionStateRoot', executionStateRoot);
        cs.writeMerkleBranch('executionStateBranch', executionStateProof);
        cs.writeBigInt('publicInputsRoot', publicInputsRoot);

        return cs.flush();
    }

    async calculateInputsForLatestSlot(client: ConsensusClient): Promise<CircomInput> {
        const update = await client.getTelepathyUpdate('finalized');
        const executionStateRootAndProof = await client.getExecutionStateRootProof(
            update.finalizedHeader.slot
        );
        return await this.calculateInputs(
            update,
            executionStateRootAndProof.executionStateRoot,
            executionStateRootAndProof.executionStateProof
        );
    }
}
