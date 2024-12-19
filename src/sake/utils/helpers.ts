import * as WakeApi from '../api/wake';

export async function pingWakeServer() {
    return await WakeApi.ping().catch((_) => {
        return false;
    });
}
