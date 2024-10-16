import { WakeApi } from '../api/wake';
import { showErrorMessage } from '../commands';
import { LocalNodeNetworkProvider } from '../network/LocalNodeNetworkProvider';
import { AppStateProvider } from '../state/AppStateProvider';
import { NetworkCreationConfiguration, NetworkId } from '../webview/shared/network_types';
import { ProviderState } from '../webview/shared/storage_types';
import { LocalNodeSakeProvider } from './LocalNodeSakeProvider';
import { v4 as uuidv4 } from 'uuid';

export class SakeProviderFactory {
    static async createNewLocalProvider(
        displayName: string,
        networkConfig?: NetworkCreationConfiguration
    ): Promise<LocalNodeSakeProvider | undefined> {
        const chainsState = AppStateProvider.getInstance();

        await WakeApi.ping()
            .then((serverRunning) => {
                chainsState.setIsWakeServerRunning(serverRunning);
            })
            .catch(() => {
                console.error('Failed to ping wake server');
                chainsState.setIsWakeServerRunning(false);
            });

        const providerId = 'local-chain-' + this.getNewProviderId();

        const provider: LocalNodeSakeProvider | undefined =
            await LocalNodeNetworkProvider.createNewChainProvider({
                ...networkConfig,
                sessionId: providerId
            })
                .then(({ network, initialized }) => {
                    const _provider = new LocalNodeSakeProvider(providerId, displayName, network);
                    if (initialized) {
                        _provider.initialize();
                    }
                    return _provider;
                })
                .catch((error) => {
                    showErrorMessage(`Failed to create new chain: ${error.message}`);
                    console.error('Failed to create new chain:', error);
                    return undefined;
                });

        return provider;
    }

    static async createFromState(state: ProviderState): Promise<LocalNodeSakeProvider | undefined> {
        const network = await (async () => {
            switch (state.network.type) {
                case NetworkId.LocalNode:
                    return await LocalNodeNetworkProvider.createFromState(state.network);
                default:
                    return undefined;
            }
        })().catch((error) => {
            console.error('Failed to create network from state:', error);
            return undefined;
        });

        if (network == undefined) {
            return undefined;
        }

        const provider = new LocalNodeSakeProvider(state.id, state.displayName, network);
        provider.loadState(state);

        return provider;
    }

    static getNewProviderId(): string {
        return uuidv4();
    }
}
