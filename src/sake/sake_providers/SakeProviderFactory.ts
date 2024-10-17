import { WakeApi } from '../api/wake';
import { showErrorMessage } from '../commands';
import { LocalNodeNetworkProvider } from '../network/LocalNodeNetworkProvider';
import { AppStateProvider } from '../state/AppStateProvider';
import { SakeError } from '../webview/shared/errors';
import {
    NetworkConfiguration,
    NetworkCreationConfiguration,
    NetworkId
} from '../webview/shared/network_types';
import {
    ProviderState,
    SakeLocalNodeProviderInitializationRequest,
    SakeProviderInitializationRequestType
} from '../webview/shared/storage_types';
import { LocalNodeSakeProvider } from './LocalNodeSakeProvider';
import { v4 as uuidv4 } from 'uuid';

export class SakeProviderFactory {
    private static async _newLocalProvider(
        providerId: string,
        displayName: string,
        networkConfig: NetworkConfiguration,
        initializationRequest: SakeLocalNodeProviderInitializationRequest
    ): Promise<LocalNodeSakeProvider> {
        const networkProvider = new LocalNodeNetworkProvider(networkConfig);

        const provider = new LocalNodeSakeProvider(
            providerId,
            displayName,
            networkProvider,
            initializationRequest
        );

        await provider.connect().catch((error) => {
            showErrorMessage(
                `Failed to initialize chain: ${
                    error instanceof Error ? error.message : String(error)
                }`
            );
        });

        return provider;
    }

    static async createNewLocalProvider(
        displayName: string,
        networkCreationConfig?: NetworkCreationConfiguration
    ): Promise<LocalNodeSakeProvider> {
        const providerId = 'local-chain-' + this.getNewProviderId();
        const networkConfig: NetworkConfiguration = {
            ...networkCreationConfig,
            sessionId: providerId
        };

        const provider = await this._newLocalProvider(providerId, displayName, networkConfig, {
            type: SakeProviderInitializationRequestType.CreateNewChain,
            accounts: networkCreationConfig?.accounts
        });

        return provider;
    }

    // TODO: generalize to support other network providers
    static async createFromState(state: ProviderState): Promise<LocalNodeSakeProvider> {
        console.log('Creating provider from state', state);
        switch (state.network.type) {
            case NetworkId.LocalNode:
                return await this._newLocalProvider(
                    state.id,
                    state.displayName,
                    state.network.config,
                    {
                        type: SakeProviderInitializationRequestType.LoadFromState,
                        state: state
                    }
                );

            default:
                throw new SakeError(`Unsupported network type: ${state.network.type}`);
        }
    }

    static getNewProviderId(): string {
        return uuidv4();
    }
}
