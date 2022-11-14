export type Hex = string;
export type Hex32 = string;
export type Hex48 = string;
export type Hex64 = string;
export type Hex96 = string;

export type BeaconVersion = 'altair' | 'bellatrix';

export type BeaconBlockHeader = {
    slot: bigint;
    proposerIndex: bigint;
    parentRoot: Hex32;
    stateRoot: Hex32;
    bodyRoot: Hex32;
};

export type SyncAggregate = {
    syncCommitteeBits: Hex64;
    syncCommitteeSignature: Hex96;
};

export type SyncCommittee = {
    pubkeys: Hex48[];
    aggregatePubkey: Hex48;
};

export type FinalityUpdate = {
    version: BeaconVersion;
    data: {
        attestedHeader: BeaconBlockHeader;
        finalizedHeader: BeaconBlockHeader;
        finalityBranch: Hex32[];
        syncAggregate: SyncAggregate;
        signatureSlot: bigint;
    };
};

export type LightClientUpdate = {
    version: BeaconVersion;
    data: {
        attestedHeader: BeaconBlockHeader;
        finalizedHeader: BeaconBlockHeader;
        finalityBranch: Hex32[];
        nextSyncCommittee: SyncCommittee;
        nextSyncCommitteeBranch: Hex32[];
        syncAggregate: SyncAggregate;
        signatureSlot: bigint;
    };
};
