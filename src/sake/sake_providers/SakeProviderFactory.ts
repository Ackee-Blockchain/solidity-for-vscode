import * as WakeApi from '../api/wake';
import { showErrorMessage } from '../commands';
import { LocalNodeNetworkProvider } from '../network/LocalNodeNetworkProvider';
import AppStateProvider from '../state/AppStateProvider';
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
import * as vscode from 'vscode';

async function _newLocalProvider(
    providerId: string,
    displayName: string,
    networkConfig: NetworkConfiguration,
    initializationRequest: SakeLocalNodeProviderInitializationRequest
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
        vscode.window.showErrorMessage(
            `Failed to connect to provider: ${e instanceof Error ? e.message : String(e)}`
        );
    }

    return provider;
}

export async function createNewLocalProvider(
    displayName: string,
    networkCreationConfig?: NetworkCreationConfiguration
): Promise<LocalNodeSakeProvider> {
    const providerId = 'local-chain-' + getNewProviderId();
    const networkConfig: NetworkConfiguration = {
        ...networkCreationConfig,
        sessionId: providerId
    };

    const provider = await _newLocalProvider(providerId, displayName, networkConfig, {
        type: SakeProviderInitializationRequestType.CreateNewChain,
        accounts: networkCreationConfig?.accounts
    });

    return provider;
}

export async function connectToLocalChain(
    displayName: string,
    uri: string
): Promise<LocalNodeSakeProvider> {
    const providerId = 'local-chain-' + getNewProviderId();
    const networkConfig: NetworkConfiguration = {
        uri,
        sessionId: providerId
    };

    const provider = await _newLocalProvider(providerId, displayName, networkConfig, {
        type: SakeProviderInitializationRequestType.ConnectToChain
    });

    return provider;
}

// TODO: generalize to support other network providers
export async function createFromState(state: ProviderState): Promise<LocalNodeSakeProvider> {
    switch (state.network.type) {
        case NetworkId.LocalNode:
            return await _newLocalProvider(state.id, state.displayName, state.network.config, {
                type: SakeProviderInitializationRequestType.LoadFromState,
                state: state
            });

        default:
            throw new SakeError(`Unsupported network type: ${state.network.type}`);
    }
}

function getNewProviderId(): string {
    return uuidv4();
}
