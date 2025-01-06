import { v4 as uuidv4 } from 'uuid';
import * as vscode from 'vscode';
import { showErrorMessage } from '../commands';
import { LocalNodeNetworkProvider } from '../network/LocalNodeNetworkProvider';
import { SakeError } from '../webview/shared/errors';
import {
    NetworkConfiguration,
    NetworkCreationConfiguration
} from '../webview/shared/network_types';
import { NetworkType } from '../webview/shared/state_types';
import {
    ProviderState,
    SakeLocalNodeProviderInitializationRequest,
    SakeProviderInitializationRequestType
} from '../webview/shared/storage_types';
import { LocalNodeSakeProvider } from './LocalNodeSakeProvider';
import sakeProviderManager from './SakeProviderManager';

async function _newLocalProvider(
    providerId: string,
    displayName: string,
    networkConfig: NetworkConfiguration,
    initializationRequest: SakeLocalNodeProviderInitializationRequest,
    onlySuccessful: boolean = false
): Promise<LocalNodeSakeProvider> {
    const networkProvider = new LocalNodeNetworkProvider(networkConfig);

    // @dev do not catch errors here, so it can be handled by the caller
    const provider = new LocalNodeSakeProvider(
        providerId,
        displayName,
        networkProvider,
        initializationRequest
    );

    // @dev allow failing connection, so it can reconnect later
    try {
        await provider.connect();
    } catch (e) {
        if (onlySuccessful) {
            provider.onDeleteProvider();
        }
        throw e;
    }

    return provider;
}

export async function createNewLocalProvider(
    displayName: string,
    networkCreationConfig?: NetworkCreationConfiguration,
    onlySuccessful: boolean = false,
    silent: boolean = false
): Promise<LocalNodeSakeProvider | undefined> {
    const providerId = 'local-chain-' + getNewProviderId();
    const networkConfig: NetworkConfiguration = {
        ...networkCreationConfig,
        sessionId: providerId
    };

    return _newLocalProvider(
        providerId,
        displayName,
        networkConfig,
        {
            type: SakeProviderInitializationRequestType.CreateNewChain,
            accounts: networkCreationConfig?.accounts
        },
        onlySuccessful
    )
        .then((provider) => {
            if (!silent) {
                notifyUserOfNewProvider(provider);
            }
            return provider;
        })
        .catch((e) => {
            showErrorMessage(`Failed to create new chain: ${e}`);
            console.error(`Failed to create provider "${providerId}": ${e}`);
            return undefined;
        });

    // return provider;
}

export async function connectToLocalChain(
    displayName: string,
    uri: string,
    onlySuccessful: boolean = false,
    silent: boolean = false
): Promise<LocalNodeSakeProvider | undefined> {
    const providerId = 'local-chain-' + getNewProviderId();
    const networkConfig: NetworkConfiguration = {
        uri,
        sessionId: providerId
    };

    return await _newLocalProvider(
        providerId,
        displayName,
        networkConfig,
        {
            type: SakeProviderInitializationRequestType.ConnectToChain
        },
        onlySuccessful
    )
        .then((provider) => {
            if (!silent) {
                notifyUserOfNewProvider(provider);
            }
            return provider;
        })
        .catch((e) => {
            showErrorMessage(`Failed to connect to chain: ${e}`);
            console.error(`Failed to connect to provider: ${e}`);
            return undefined;
        });
}

// TODO: generalize to support other network providers
export async function createFromState(
    state: ProviderState,
    silent: boolean = false
): Promise<LocalNodeSakeProvider | undefined> {
    switch (state.network.type) {
        case NetworkType.Local:
            return await _newLocalProvider(state.id, state.displayName, state.network.config, {
                type: SakeProviderInitializationRequestType.LoadFromState,
                state: state
            })
                .then((provider) => {
                    if (!silent) {
                        notifyUserOfNewProvider(provider);
                    }
                    return provider;
                })
                .catch((e) => {
                    showErrorMessage(`Failed to load chain ${state.displayName}: ${e}`);
                    console.error(`Failed to load provider "${state.id}": ${e}`);
                    return undefined;
                });

        default:
            throw new SakeError(`Unsupported network type: ${state.network.type}`);
    }
}

function getNewProviderId(): string {
    return uuidv4();
}

function notifyUserOfNewProvider(provider: LocalNodeSakeProvider) {
    vscode.window
        .showInformationMessage(
            `New local chain '${provider.displayName}' created.`,
            'Switch to chain'
        )
        .then((selected) => {
            if (selected === 'Switch to chain') {
                sakeProviderManager.setProvider(provider.id);
            }
        });
}
