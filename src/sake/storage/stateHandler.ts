import { showErrorMessage, showInfoMessage } from '../commands';
import { ISakeProvider } from '../sake_providers/BaseSakeProvider';
import { createFromState } from '../sake_providers/SakeProviderFactory';
import SakeState from '../sake_providers/SakeState';
import { chainRegistry } from '../state/shared/ChainRegistry';
import { ProviderState } from '../webview/shared/storage_types';
import {
    deleteProviderState,
    readFullState,
    readProviderState,
    saveProviderState
} from './stateUtils';

/**
 * Saves the state of all providers to storage
 */
export async function saveFullState() {
    chainRegistry.getAll().forEach((provider) => {
        saveChainState(provider);
    });
}

/**
 * Loads all provider states from storage and recreates the providers
 * @throws Error if full state cannot be loaded
 * @returns True if state was loaded successfully, false if there were any errors
 */
export async function loadFullState(): Promise<boolean> {
    try {
        const storedState = await readFullState();
        if (storedState == undefined) {
            throw new Error('Failed to read state');
        }

        const providerStates = storedState.providerStates;
        const failedProviders: string[] = [];

        for (const providerState of providerStates) {
            const provider = await createFromState(providerState, true).catch((e) => {
                console.error(`Failed to load provider "${providerState.displayName}": ${e}`);
                failedProviders.push(providerState.displayName);
                return undefined;
            });
        }

        // Show a single consolidated error message if any providers failed to load
        if (failedProviders.length > 0) {
            const message =
                failedProviders.length === 1
                    ? `Failed to restore saved state for chain: ${failedProviders[0]}. The chain will start fresh.`
                    : `Failed to restore saved state for ${failedProviders.length} chains: ${failedProviders.join(', ')}. These chains will start fresh.`;
            showErrorMessage(message, true);
        }

        if (storedState.sharedState) {
            SakeState.loadSharedState(storedState.sharedState);
        }
        // console.log('Reloaded saved chain states');
        // showInfoMessage(`Reloaded saved chain states`);
    } catch (e) {
        console.error('Failed to load state:', e);
        showErrorMessage('Failed to restore saved state. The chains will start fresh.', true);
        return false;
    }

    return true;
}

/**
 * Saves the state of a provider to storage
 * @param provider - The provider whose state should be saved
 * @returns True if state was saved successfully, false if there were any errors
 */
export async function saveChainState(provider: ISakeProvider): Promise<boolean> {
    try {
        const providerState = await provider.dumpState();
        saveProviderState(providerState);
    } catch (e) {
        showErrorMessage(`Failed to dump provider state: ${e}`, true);
        return false;
    }

    return true;
}

/**
 * Loads a provider's state from storage
 * @param provider - The provider whose state should be loaded
 * @returns The provider's state, or undefined if there was an error
 */
export async function loadChainState(provider: ISakeProvider): Promise<ProviderState | undefined> {
    try {
        const providerState = await readProviderState(provider);
        return providerState;
    } catch (e) {
        showErrorMessage(`Failed to load chain state: ${e}`, true);
        return undefined;
    }
}

/**
 * Deletes a provider's state from storage
 * @param provider - The provider whose state should be deleted
 * @returns True if state was deleted successfully, false if there were any errors
 */
export async function deleteChainState(provider: ISakeProvider): Promise<boolean> {
    try {
        await deleteProviderState(provider);
    } catch (e) {
        showErrorMessage(`Failed to delete chain state: ${e}`, true);
        return false;
    }

    return true;
}
