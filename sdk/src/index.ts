import { consensusRpcUrls } from './lightclient/config';
import { NimbusLightClient } from './lightclient/nimbus';
import { getClient } from '@lodestar/api';
import { config } from '@lodestar/config/default';

export async function main() {
    const api = getClient({ baseUrl: 'https://lodestar-goerli.chainsafe.io' }, { config });
    const lc = new NimbusLightClient(consensusRpcUrls.nimbus);
    const result = await lc.getFinalityUpdate();
    console.log(result);
}

main();
