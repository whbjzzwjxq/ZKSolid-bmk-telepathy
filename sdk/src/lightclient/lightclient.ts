import { FinalityUpdate, LightClientUpdate } from '../common/containers';
import { AxiosInstance } from 'axios';
import axios from 'axios';
import { GuardedDeserializer } from '../common/deserialize';

/**
 * A lightclient middleware for connecting to various Ethereum 2.0 consensus clients. The idea here
 * is that each consensus client implementation can inherit this class and adjust the logic as
 * needed. In most cases, almost nothing besides the consensus rpc should need to be changed.
 *
 * In the future, we should implement a "RobustLightClient", which amortizes the risk of a single
 * consensus client failing among many nodes and many different implementations.
 */
export class LightClient {
    consensusRpc: string;
    gd: GuardedDeserializer;
    client: AxiosInstance;

    constructor(consensusRpc: string) {
        this.consensusRpc = consensusRpc;
        this.gd = new GuardedDeserializer();
        this.client = axios.create({
            baseURL: this.consensusRpc,
            responseType: 'json',
            headers: { 'Content-Type': 'application/json' }
        });
    }

    /** Gets the latest finalized update from the sync committee. */
    async getFinalityUpdate(): Promise<FinalityUpdate> {
        throw Error('Not implemented');
    }

    /** Gets the best updates for a given period. */
    async getUpdates(period: number, count = 1): Promise<LightClientUpdate[]> {
        throw Error('Not implemented');
    }
}
