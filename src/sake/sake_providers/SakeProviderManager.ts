import * as vscode from 'vscode';
import { getTextFromInputBox, showErrorMessage } from '../commands';
import { ISakeProvider } from './BaseSakeProvider';

import { chainRegistry } from '../state/shared/ChainRegistry';
import { extensionState } from '../state/shared/ExtensionState';
import { sendSignalToWebview } from '../utils/helpers';
import { SignalId } from '../webview/shared/messaging_types';
import { ProviderState, StoredSakeState } from '../webview/shared/storage_types';
import * as SakeProviderFactory from './SakeProviderFactory';
import { createNewLocalProvider } from './SakeProviderFactory';
import SakeState from './SakeState';
import { saveSharedState } from '../storage/stateUtils';

export const sakeProviderManager = {
    async removeProvider(provider: ISakeProvider) {
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

        if (provider.id === extensionState.get().currentChainId) {
            extensionState.setLazy({
                currentChainId: undefined
            });
        }
    },

    get currentChainId() {
        return extensionState.get().currentChainId;
    },

    get provider() {
        if (!this.currentChainId) {
            return undefined;
        }

        return chainRegistry.get(this.currentChainId);
    },

    get providers() {
        return chainRegistry.getAll();
    },

    setProvider(id: string) {
        if (!chainRegistry.contains(id)) {
            throw new Error('Provider with id ' + id + ' does not exist');
        }

        if (this.currentChainId === id) {
            return;
        }

        this.provider?.onDeactivateProvider();
        extensionState.setLazy({
            currentChainId: id
        });
        this.provider?.onActivateProvider();

        // try to reconnect provider
        if (!this.provider?.providerState.connected) {
            try {
                this.provider?.connect();
            } catch (e) {
                showErrorMessage(
                    `Failed to reconnect provider: ${e instanceof Error ? e.message : String(e)}`
                );
            }
        }
    },

    /* State Handling */

    async saveSharedState() {
        const sharedState = SakeState.dumpSharedState();
        await saveSharedState(sharedState);
    },

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
            // filter out undefined state
            providerStates = _providerStates.filter((state) => state !== undefined);
        }

        // Load shared state
        const sharedState = SakeState.dumpSharedState();

        return {
            sharedState: sharedState,
            providerStates
        };
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

    async requestNewLocalProvider() {
        // get input from user
        const chainName = await getTextFromInputBox(
            'Select a name for the new chain',
            this.proposeChainName()
        );

        if (!chainName) {
            return;
        }

        return await createNewLocalProvider(chainName);
    },

    async requestRenameProvider(provider: ISakeProvider) {
        const newName = await getTextFromInputBox('Rename chain', provider.displayName);
        if (!newName) {
            return;
        }
        await provider.rename(newName);
    },

    proposeChainName() {
        let name = 'Local Chain 1';
        let i = 1;
        const providers = chainRegistry.getAll();
        while (providers.some((provider) => provider.displayName === name)) {
            name = `Local Chain ${i++}`;
        }
        return name;
    },

    async requestNewAdvancedLocalProvider() {
        sendSignalToWebview(SignalId.showAdvancedLocalChainSetup);
    }
};

export default sakeProviderManager;
