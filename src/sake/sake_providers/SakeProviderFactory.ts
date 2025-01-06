import { v4 as uuidv4 } from 'uuid';
import * as vscode from 'vscode';
import { showErrorMessage } from '../commands';
import { LocalNodeNetworkProvider } from '../network/LocalNodeNetworkProvider';
import { autosaveDefault } from '../storage/autosave';
import { SakeError } from '../webview/shared/errors';
import {
    NetworkConfiguration,
    NetworkCreationConfiguration
} from '../webview/shared/network_types';
import { ChainPersistence, NetworkType } from '../webview/shared/state_types';
import {
    ProviderState,
    SakeLocalNodeProviderInitializationRequest,
    SakeProviderInitializationRequestType,
    SakeProviderType
} from '../webview/shared/storage_types';
import { LocalNodeSakeProvider } from './LocalNodeSakeProvider';
import sakeProviderManager from './SakeProviderManager';
import { ConnectionSakeProvider } from './ConnectionSakeProvider';

async function _newLocalProvider(
    type: SakeProviderType,
    providerId: string,
    displayName: string,
    networkConfig: NetworkConfiguration,
    initializationRequest: SakeLocalNodeProviderInitializationRequest,
    persistence: ChainPersistence,
    onlySuccessful: boolean = false
): Promise<LocalNodeSakeProvider> {
    const networkProvider = new LocalNodeNetworkProvider(networkConfig);

    // @dev do not catch errors here, so it can be handled by the caller
    let provider;
    switch (type) {
        case SakeProviderType.LocalNode:
            provider = new LocalNodeSakeProvider(
                providerId,
                displayName,
                networkProvider,
                initializationRequest,
                persistence
            );
            break;

        case SakeProviderType.Connection:
            provider = new ConnectionSakeProvider(
                providerId,
                displayName,
                networkProvider,
                initializationRequest,
                persistence
            );
            break;

        default:
            throw new Error('Invalid provider type');
    }

    // @dev allow failing connection, so it can reconnect later
    try {
        await provider.connect();
        if (
            persistence.isAutosaveEnabled &&
            (persistence.isDirty || persistence.lastSaveTimestamp == undefined)
        ) {
            await provider.saveState();
        }
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
        SakeProviderType.LocalNode,
        providerId,
        displayName,
        networkConfig,
        {
            type: SakeProviderInitializationRequestType.CreateNew,
            accounts: networkCreationConfig?.accounts
        },
        getDefaultPersistence(),
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
        SakeProviderType.Connection,
        providerId,
        displayName,
        networkConfig,
        {
            type: SakeProviderInitializationRequestType.CreateNew
        },
        getDefaultPersistence(),
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
            return await _newLocalProvider(
                state.type,
                state.id,
                state.displayName,
                state.network.config,
                {
                    type: SakeProviderInitializationRequestType.LoadFromState,
                    state: state
                },
                state.persistence
            )
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

function getDefaultPersistence() {
    return {
        isDirty: false,
        isAutosaveEnabled: autosaveDefault,
        lastSaveTimestamp: undefined
    };
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
