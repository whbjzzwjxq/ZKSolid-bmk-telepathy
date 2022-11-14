import {
    BeaconBlockHeader,
    BeaconVersion,
    FinalityUpdate,
    Hex,
    Hex32,
    Hex48,
    Hex64,
    Hex96,
    LightClientUpdate,
    SyncAggregate,
    SyncCommittee
} from './containers';

/**
 * Implements deserialization methods from JSON for Ethereum 2.0 containers. Currently assumes that
 * all variables are named according to the consensus spec. In the future, we should implemented a
 * Serializer which can be used together with the GuardedSerializer to read from disk.
 *
 * For any new container, implement a new method and follow these rules to ensure safety:
 *  1) Check the input type at the top of the function (e.g., object or string with checkType)
 *  2) Before accessing any property on an 'object', check the existence of that propety
 *
 * We should be *very careful* about code written here to avoid runtime panics downstream.
 */
export class GuardedDeserializer {
    /** Checks that the given data is of a given type. */
    checkType(data: any, type: string) {
        if (typeof data !== type) {
            throw Error(`Tried to deserialize but was not given a ${type}`);
        }
    }

    /** Checks for the existence of some property in an object. */
    checkProperty(data: any, property: string) {
        if (!(property in data)) {
            throw Error(`Tried to deserialize but ${property} doesn't exist`);
        }
    }

    /** Combines checkProperty and checkType for simplicity. */
    checkPropertyAndType(data: any, property: string, type: string) {
        this.checkProperty(data, property);
        this.checkType(data[property], type);
    }

    /** Checks that the length of a given string is expectedLength. */
    checkLength(data: string, expectedLength: number) {
        if (data.length != expectedLength) {
            throw Error(`Tried to deserialize but length was ${data.length}`);
        }
    }

    /** Deserializes a Hex from a string. Assumes that the string starts with '0x'. */
    readHex(data: string): Hex {
        this.checkType(data, 'string');
        if (data[0] != '0' || data[1] != 'x') {
            throw Error('Tried to deserialize Hex256 but did not start with "0x"');
        }
        return data as Hex;
    }

    /** Deserializes a Hex32 (32 bytes) from a string. */
    readHex32(data: string): Hex32 {
        const hex = this.readHex(data);
        this.checkLength(hex, 66);
        return hex as Hex32;
    }

    /** Deserializes a Hex32 (48 bytes) from a string. */
    readHex48(data: string): Hex48 {
        const hex = this.readHex(data);
        this.checkLength(hex, 98);
        return hex as Hex48;
    }

    /** Deserializes a Hex64 (64 bytes) from a string. */
    readHex64(data: string): Hex64 {
        const hex = this.readHex(data);
        this.checkLength(hex, 130);
        return hex as Hex64;
    }

    /** Deserializes a Hex96 (64 bytes) from a string. */
    readHex96(data: string): Hex96 {
        const hex = this.readHex(data);
        this.checkLength(hex, 194);
        return hex as Hex96;
    }

    /** Deserializes a Merkle branch based on Ethereum's SimpleSerialize. */
    readMerkleBranch(data: string[], expectedLength: number): Hex32[] {
        if (data.length !== expectedLength) {
            throw Error(`finalityBranch had length ${data.length} but expected ${expectedLength}`);
        }
        const result: Hex32[] = [];
        for (let i = 0; i < data.length; i++) {
            result.push(this.readHex32(data[i]));
        }
        return result;
    }

    /** Deserializes a consensus client version. */
    readBeaconVersion(data: string): BeaconVersion {
        this.checkType(data, 'string');
        if (data === 'altair') {
            return data as BeaconVersion;
        } else if (data == 'bellatrix') {
            return data as BeaconVersion;
        } else {
            throw Error(`Unsupported BeaconVersion ${data}`);
        }
    }

    /** Deserializes a BeaconBlockHeader. */
    readBeaconBlockheader(data: any): BeaconBlockHeader {
        this.checkType(data, 'object');
        this.checkPropertyAndType(data, 'slot', 'string');
        const slot = BigInt(data.slot);

        this.checkPropertyAndType(data, 'proposer_index', 'string');
        const proposerIndex = BigInt(data.proposer_index);

        this.checkProperty(data, 'parent_root');
        const parentRoot = this.readHex32(data.parent_root);

        this.checkProperty(data, 'state_root');
        const stateRoot = this.readHex32(data.state_root);

        this.checkProperty(data, 'body_root');
        const bodyRoot = this.readHex32(data.body_root);

        return { slot, proposerIndex, parentRoot, stateRoot, bodyRoot };
    }

    /** Deserializes a FinalityBranch. */
    readFinalityBranch(data: string[]): Hex32[] {
        return this.readMerkleBranch(data, 6);
    }

    /** Deserializes a SyncCommitteeBranch. */
    readSyncCommitteeBranch(data: string[]): Hex32[] {
        return this.readMerkleBranch(data, 5);
    }

    /** Deserializes a SyncCommittee. */
    readSyncCommittee(data: any): SyncCommittee {
        this.checkType(data, 'object');

        this.checkProperty(data, 'pubkeys');
        if (data.pubkeys.length !== 512) {
            throw Error('Unexpected sync committee size');
        }
        const pubkeys: Hex48[] = [];
        for (let i = 0; i < data.pubkeys.length; i++) {
            pubkeys.push(this.readHex48(data.pubkeys[i]));
        }

        this.checkProperty(data, 'aggregate_pubkey');
        const aggregatePubkey = this.readHex48(data.aggregate_pubkey);

        return { pubkeys, aggregatePubkey };
    }

    /** Deserializes a SyncAggregate. */
    readSyncAggregate(data: any): SyncAggregate {
        this.checkType(data, 'object');
        this.checkProperty(data, 'sync_committee_bits');
        const syncCommitteeBits = this.readHex64(data.sync_committee_bits);

        this.checkProperty(data, 'sync_committee_signature');
        const syncCommitteeSignature = this.readHex96(data.sync_committee_signature);

        return { syncCommitteeBits, syncCommitteeSignature };
    }

    /** Deserializes a FinalityUpdate. */
    readFinalityUpdate(data: any): FinalityUpdate {
        this.checkType(data, 'object');
        this.checkPropertyAndType(data, 'version', 'string');
        const version = this.readBeaconVersion(data.version);

        this.checkPropertyAndType(data, 'data', 'object');
        const body = data.data;

        this.checkProperty(body, 'attested_header');
        const attestedHeader = this.readBeaconBlockheader(body.attested_header);

        this.checkProperty(body, 'finalized_header');
        const finalizedHeader = this.readBeaconBlockheader(body.finalized_header);

        this.checkProperty(body, 'finality_branch');
        const finalityBranch = this.readFinalityBranch(body.finality_branch);

        this.checkProperty(body, 'sync_aggregate');
        const syncAggregate = this.readSyncAggregate(body.sync_aggregate);

        this.checkPropertyAndType(body, 'signature_slot', 'string');
        const signatureSlot = BigInt(body.signature_slot);

        return {
            version,
            data: {
                attestedHeader,
                finalizedHeader,
                finalityBranch,
                syncAggregate,
                signatureSlot
            }
        };
    }

    /** Deserializes a LightClientUpdate. */
    readLightClientUpdate(data: any): LightClientUpdate {
        const finalityUpdate = this.readFinalityUpdate(data);

        this.checkPropertyAndType(data, 'data', 'object');
        const body = data.data;

        this.checkProperty(body, 'next_sync_committee_branch');
        const syncCommitteeBranch = this.readSyncCommitteeBranch(body.next_sync_committee_branch);

        this.checkProperty(body, 'next_sync_committee');
        const syncCommittee = this.readSyncCommittee(body.next_sync_committee);

        return {
            version: finalityUpdate.version,
            data: {
                attestedHeader: finalityUpdate.data.attestedHeader,
                finalizedHeader: finalityUpdate.data.finalizedHeader,
                finalityBranch: finalityUpdate.data.finalityBranch,
                nextSyncCommittee: syncCommittee,
                nextSyncCommitteeBranch: syncCommitteeBranch,
                syncAggregate: finalityUpdate.data.syncAggregate,
                signatureSlot: finalityUpdate.data.signatureSlot
            }
        };
    }
}
