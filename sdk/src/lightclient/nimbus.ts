import { FinalityUpdate, LightClientUpdate } from '../common/containers';
import { LightClient } from './lightclient';
import { lightClientRoutes } from './config';

export class NimbusLightClient extends LightClient {
    async getFinalityUpdate(): Promise<FinalityUpdate> {
        const response = await this.client.get(lightClientRoutes.getFinalityUpdate);
        const finalityUpdate = this.gd.readFinalityUpdate(response.data);
        return finalityUpdate;
    }

    async getUpdates(startPeriod: number, count = 1): Promise<LightClientUpdate[]> {
        const response = await this.client.get(lightClientRoutes.getUpdates, {
            params: {
                start_period: startPeriod,
                count: count
            }
        });
        console.log(response.data);
        return response.data.map((x: any) => {
            return this.gd.readLightClientUpdate(x);
        });
    }
}
