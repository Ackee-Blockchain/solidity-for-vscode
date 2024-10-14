import { WakeApi } from '../api/wake';
import { showErrorMessage } from '../commands';
import { LocalNodeNetworkProvider } from '../network/LocalNodeNetworkProvider';
import { AppStateProvider } from '../state/AppStateProvider';
import { NetworkCreationConfiguration } from '../webview/shared/network_types';
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

    static getNewProviderId(): string {
        return uuidv4();
    }
}
