pragma circom 2.0.5;

include "../../../circuits/circuits/poseidon.circom";
include "../../../circuits/circuits/constants.circom";

template PoseidonSyncCommittee() {
    var N = getNumBitsPerRegister();
    var K = getNumRegisters();
    var SYNC_COMMITTEE_SIZE = getSyncCommitteeSize();

    signal input pubkeys[SYNC_COMMITTEE_SIZE][2][K];
    signal output out;
    
    component hasher = PoseidonG1Array(SYNC_COMMITTEE_SIZE, N, K);
    for (var i = 0; i < SYNC_COMMITTEE_SIZE; i++) {
        for (var j = 0; j < K; j++) {
            for (var l = 0; l < 2; l++) {
                hasher.pubkeys[i][l][j] <== pubkeys[i][l][j];
            }
        }
    }

    out <== hasher.out;
}

component main {public [pubkeys]} = PoseidonSyncCommittee();