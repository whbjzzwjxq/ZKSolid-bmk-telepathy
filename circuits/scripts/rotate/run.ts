import { ConsensusClient, RotateCircuit, stringifyCircomInput } from '@succinctlabs/telepathy-sdk';
import fs from 'fs';

const CONSENSUS_RPC_URL = 'https://prysm-goerli.succinct.xyz/';

async function main() {
    const client = new ConsensusClient(CONSENSUS_RPC_URL);
    const circuit = new RotateCircuit('~/zk-light-client/circuits/build/rotate_cpp/rotate');
    const input = await circuit.calculateInputsForLatestPeriod(client);
    fs.writeFileSync('input.json', stringifyCircomInput(input));
    await circuit.calculateWitness(input, '/tmp/witness.wtns');
}

main();
