import { BigNumber } from 'ethers';
import { Groth16ProofStruct } from './types/ethers-contracts/LightClient';
import { CircomProof } from '@succinctlabs/telepathy-sdk';

export function toGroth16ProofFromCircomProof(proof: CircomProof): Groth16ProofStruct {
    return {
        a: [BigNumber.from(proof.pi_a[0]), BigNumber.from(proof.pi_a[1])],
        b: [
            [BigNumber.from(proof.pi_b[0][1]), BigNumber.from(proof.pi_b[0][0])],
            [BigNumber.from(proof.pi_b[1][1]), BigNumber.from(proof.pi_b[1][0])]
        ],
        c: [BigNumber.from(proof.pi_c[0]), BigNumber.from(proof.pi_c[1])]
    };
}
