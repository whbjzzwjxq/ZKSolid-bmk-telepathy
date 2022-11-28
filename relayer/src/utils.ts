import { AxiosInstance } from 'axios';
import { BigNumber } from 'ethers';

export async function getBlockNumberFromSlot(slot: BigNumber, consensusClient: AxiosInstance) {
    const { data } = await consensusClient.get(`/eth/v2/beacon/blocks/${slot}`);
    return parseInt(data.message.body.execution_payload.block_number);
}
