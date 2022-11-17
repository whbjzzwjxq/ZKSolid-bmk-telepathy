import { StepCircuit, ConsensusClient, stringifyCircomInput } from '@succinctlabs/telepathy-sdk';
import fs from 'fs';

const CONSENSUS_RPC_URL = 'https://prysm-goerli.succinct.xyz/';

async function main() {
    const client = new ConsensusClient(CONSENSUS_RPC_URL);
    const circuit = new StepCircuit('~/zk-light-client/circuits/build/step_cpp/step');
    const input = await circuit.calculateInputsForLatestSlot(client);
    fs.writeFileSync('input.json', stringifyCircomInput(input));
    await circuit.calculateWitness(input, '/tmp/witness.wtns');
}

main();
