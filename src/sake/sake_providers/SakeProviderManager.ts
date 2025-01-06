import {
    AccountState,
    Address,
    DeployedContractType,
    DeploymentState,
    NetworkCreationConfiguration,
    NetworkType,
    SignalId,
    TransactionHistoryState,
    WebviewMessageId
} from '../webview/shared/types';
import appState from '../state/AppStateProvider';
import * as vscode from 'vscode';
import { getTextFromInputBox, showErrorMessage } from '../commands';
import { BaseSakeProvider } from './BaseSakeProvider';

import { SakeProviderQuickPickItem } from '../webview/shared/helper_types';
import { SakeContext } from '../context';
import * as SakeProviderFactory from './SakeProviderFactory';
import {
    ProviderState,
    SakeProviderInitializationRequestType,
    StoredSakeState
} from '../webview/shared/storage_types';
import SakeState from './SakeState';
import { NetworkProvider } from '../network/NetworkProvider';
import { LocalNodeNetworkProvider } from '../network/LocalNodeNetworkProvider';
import { additionalSakeState, chainRegistry } from '../state/ChainRegistry';
import { providerRegistry } from './ProviderRegistry';
import { StorageHandler } from '../storage/StorageHandler';

export const sakeProviderManager = {
    async removeProvider(provider: BaseSakeProvider<NetworkProvider>) {
        if (!chainRegistry.contains(provider.id)) {
            throw new Error('Provider with id ' + provider.id + ' does not exist');
        }

        try {
            await provider.onDeleteProvider();
        } catch (e) {
            showErrorMessage(
                `Failed to delete chain: ${e instanceof Error ? e.message : String(e)}`
            );
        }

        if (provider.id === additionalSakeState.get().currentChainId) {
            additionalSakeState.setLazy({
                currentChainId: undefined
            });
        }
    },

    get currentChainId() {
        return additionalSakeState.get().currentChainId;
    },

    get provider() {
        if (!this.currentChainId) {
            return undefined;
        }

        return providerRegistry.get(this.currentChainId);
    },

    get providers() {
        return providerRegistry.getAll();
    },

    get state() {
        return this.provider?.states;
    },

    // get network() {
    //     return this.provider.network;
    // }

    setProvider(id: string) {
        if (!chainRegistry.contains(id)) {
            throw new Error('Provider with id ' + id + ' does not exist');
        }

        if (this.currentChainId === id) {
            return;
        }

        this.provider?.onDeactivateProvider();
        additionalSakeState.setLazy({
            currentChainId: id
        });
        this.provider?.onActivateProvider();

        // force update provider
        this.state?.sendToWebview();

        // try to reconnect provider
        if (!this.provider?.connected) {
            try {
                this.provider?.connect();
            } catch (e) {
                showErrorMessage(
                    `Failed to reconnect provider: ${e instanceof Error ? e.message : String(e)}`
                );
            }
        }
    },

    async requestNewLocalProvider() {
        // get input from user
        const chainName = await getTextFromInputBox(
            'Select a name for the new chain',
            await this.getProposedChainName()
        );

        if (!chainName) {
            return;
        }

        return await SakeProviderFactory.createNewLocalProvider(chainName);
    },

    async getProposedChainName() {
        let name = 'Local Chain 1';
        let i = 1;
        while (this.providers.some((provider) => provider.displayName === name)) {
            name = `Local Chain ${i++}`;
        }
        return name;
    },

    async createNewLocalChain(
        displayName: string,
        networkCreationConfig?: NetworkCreationConfiguration,
        onlySuccessful: boolean = false
    ) {
        return await SakeProviderFactory.createNewLocalProvider(
            displayName,
            networkCreationConfig,
            onlySuccessful
        );
    },

    async connectToLocalChain(displayName: string, uri: string, onlySuccessful: boolean = false) {
        return await SakeProviderFactory.connectToLocalChain(displayName, uri, onlySuccessful);
    },

    async requestNewAdvancedLocalProvider() {
        this.sendSignalToWebview(SignalId.showAdvancedLocalChainSetup);
    },

    sendSignalToWebview(signal: SignalId, data?: any) {
        const webview = SakeContext.getInstance().webviewProvider;
        if (!webview) {
            console.error(`A signal (${signal}) was requested but no webview was found.`);
            return;
        }
        webview.postMessageToWebview({
            command: WebviewMessageId.onSignal,
            signalId: signal,
            payload: data
        });
    },

    /* State Handling */

    async dumpState(providerStates?: ProviderState[]) {
        // Load all providers
        if (providerStates === undefined) {
            const _providerStates = await Promise.all(
                this.providers.map(async (provider) => {
                    try {
                        return await provider.dumpState();
                    } catch (error) {
                        vscode.window.showErrorMessage(
                            `Failed to dump state for provider ${provider.displayName}: ${error}`
                        );
                        console.error(
                            `Failed to dump state for provider ${provider.displayName}: ${error}`
                        );
                        return undefined;
                    }
                })
            );
            // filter out undefined states
            providerStates = _providerStates.filter((state) => state !== undefined);
        }

        console.log('providerStates', providerStates);

        // Load shared state
        const sharedState = SakeState.dumpSharedState();

        return {
            sharedState: sharedState,
            providerStates
        };
    },

    async loadState(state: StoredSakeState, silent: boolean = false) {
        SakeState.loadSharedState(state.sharedState);
        for (const providerState of state.providerStates) {
            this.createProviderFromState(providerState);
        }
    },

    async createProviderFromState(providerState: ProviderState, silent: boolean = false) {
        try {
            await SakeProviderFactory.createFromState(providerState);
        } catch (error) {
            console.error(`Failed to create provider "${providerState.id}": ${error}`);

            vscode.window.showErrorMessage(
                `Failed to load chain "${providerState.displayName}": ${
                    error instanceof Error ? error.message : String(error)
                }`
            );
        }
    },

    async reloadState(): Promise<void> {
        // try {
        //     await this.resetChains();
        //     await StorageHandler.loadExtensionState();
        // } catch (error) {
        //     console.error('Failed to reload state:', error);
        //     showErrorMessage(
        //         `Failed to reload state: ${error instanceof Error ? error.message : String(error)}`
        //     );
        //     return false;
        // }
        // return true;

        const storedState = await StorageHandler.getExtensionState();
        const getStoredState = (providerId: string) => {
            return storedState?.providerStates.find((state) => state.id === providerId);
        };

        this.providers.forEach((provider) => {
            if (
                // only try to reconnect to existing chains
                provider.initializationRequest.type ==
                SakeProviderInitializationRequestType.ConnectToChain
            ) {
                provider.connect();
            } else {
                // otherwise state was created via wake and has to be recreated
                this.removeProvider(provider);
                const providerState = getStoredState(provider.id);
                if (providerState == undefined) {
                    vscode.window.showErrorMessage(
                        `Failed to reload chain "${provider.displayName}": No state found`
                    );
                    return;
                }
                this.createProviderFromState(providerState, true);
            }
        });
    },

    async resetChains() {
        providerRegistry.getAll().forEach((provider) => {
            provider.onDeleteProvider();
        });

        additionalSakeState.setLazy({
            currentChainId: undefined
        });
    }
};

export default sakeProviderManager;
