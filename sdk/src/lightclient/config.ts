/**
 * A default config for connecting to consensus clients. In production, these arguments should be
 * passed via client arguments and not rely on these global variables.
 */

export const consensusRpcUrls = {
    nimbus: 'http://testing.mainnet.beacon-api.nimbus.team',
    lodestar: 'http://lodestar-goerli.succinct.xyz'
};

export const lightClientRoutes = {
    getFinalityUpdate: '/eth/v1/beacon/light_client/finality_update',
    getUpdates: '/eth/v1/beacon/light_client/updates'
};
