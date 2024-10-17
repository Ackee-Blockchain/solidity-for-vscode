import { BaseSakeProvider } from '../sake_providers/SakeProvider';
import { LocalNodeNetworkProvider } from './LocalNodeNetworkProvider';
import { NetworkProvider } from './NetworkProvider';

export class NetworkManager {
    private static _instance: NetworkManager;
    // TODO: generalize to support other network providers
    private _providers: Map<string, NetworkProvider>;

    private constructor() {
        this._providers = new Map<string, NetworkProvider>();
    }

    static getInstance(): NetworkManager {
        if (!this._instance) {
            this._instance = new NetworkManager();
        }

        return this._instance;
    }

    addProvider(provider: NetworkProvider) {
        this._providers.set(provider.type, provider);
    }

    deleteProvider(provider: NetworkProvider) {
        this._providers.delete(provider.type);
    }

    /*
     * Helper function to disconnect all local node providers in case Wake LSP fails
     */
    disconnectLocalProviders() {
        for (const provider of this._providers.values()) {
            if (provider instanceof LocalNodeNetworkProvider) {
                provider.connected = false;
            }
        }
    }
}
