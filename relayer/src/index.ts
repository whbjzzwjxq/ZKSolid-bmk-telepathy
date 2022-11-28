import { Relayer, RelayerConfig } from './relayer';
import { MockOperator } from './mockOperator';
import { envSafeLoad } from '@succinctlabs/telepathy-sdk/devops';

import config from 'dotenv';
import { exit } from 'process';
config.config({ path: '../.env' });

async function main() {
    const PRIVATE_KEY = envSafeLoad('PRIVATE_KEY');

    const sourceChainId = parseInt(envSafeLoad('SOURCE_CHAIN_ID'));
    const chainIds = envSafeLoad('CHAIN_IDS').slice(1).slice(0, -1).split(' ');
    console.log('Source chain id:', sourceChainId);
    console.log('Destination chain ids:', chainIds);

    const config: RelayerConfig = {
        sourceChainId: sourceChainId,
        sourceChainRpc: envSafeLoad(`RPC_${sourceChainId}`),
        sourceAmbAddress: envSafeLoad(`SourceAMB_ADDRESS_${sourceChainId}`),
        sourceChainConsensusRpc: 'https://prysm-goerli.succinct.xyz', // TODO load this from env
        beaconChainRpc: 'https://goerli.beaconcha.in/api',
        beaconChainAPIKey: 'VVNBYjFvRTBRT3dHTVlQaUc2SEsu',
        destinationChains: chainIds.map((chainId: string) => {
            return {
                rpc: envSafeLoad(`RPC_${chainId}`),
                targetAmbAddress: envSafeLoad(`TargetAMB_ADDRESS_${chainId}`),
                beaconLightClientAddress: envSafeLoad(`LightClient_ADDRESS_${chainId}`),
                chainId: parseInt(chainId),
                privateKey: PRIVATE_KEY
            };
        })
    };
    console.log('Starting relayer');
    const relayer = new Relayer(config);
    relayer.start();

    // console.log('Starting mock operator');
    // const mockOperator = new MockOperator(config);
    // mockOperator.start();

    console.log('Starting backfill');
    await relayer.backfill(7978352, undefined);
}

main();
