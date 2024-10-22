import { writable, get, derived } from 'svelte/store';
import {
    StateId,
    WebviewMessageId,
    type AccountState,
    type AppState,
    type ChainState,
    type CompilationState,
    type DeploymentState,
    type WebviewMessageRequest,
    type WebviewMessageResponse
} from '../../shared/types';
import { messageHandler } from '@estruyf/vscode/dist/client';
import { REQUEST_STATE_TIMEOUT } from '../helpers/constants';
import { loadedState, selectedAccount, setSelectedAccount } from './appStore';

/**
 * backend data
 */

export const accounts = writable<AccountState>([]);
export const deployedContracts = writable<DeploymentState>([]);
export const compilationState = writable<CompilationState>({
    contracts: [],
    issues: [],
    dirty: true
});
export const appState = writable<AppState>({
    isAnvilInstalled: undefined,
    isWakeServerRunning: undefined,
    isOpenWorkspace: undefined
});
export const chainState = writable<ChainState>({
    chains: [],
    currentChainId: undefined
});
export const currentChain = derived(chainState, ($chainState) => {
    return $chainState.chains.find((chain) => chain.chainId === $chainState.currentChainId);
});

/**
 * setup stores
 */

export async function restartWakeServer(): Promise<boolean> {
    const timeout = new Promise<void>((_, reject) =>
        setTimeout(() => reject(new Error('Request timed out')), REQUEST_STATE_TIMEOUT)
    );

    return await Promise.race([
        messageHandler.request<{
            success: boolean;
        }>(WebviewMessageId.onRestartWakeServer, {}),
        timeout
    ])
        .then((result) => {
            return (result as { success: boolean }).success;
        })
        .catch((_) => {
            console.error('Requesting state from the extension timed out');
            return false;
        });
}

export async function requestState(): Promise<boolean> {
    const timeout = new Promise<void>((_, reject) =>
        setTimeout(() => reject(new Error('Request timed out')), REQUEST_STATE_TIMEOUT)
    );

    const wrapper = async (stateId: StateId) => {
        const result = await messageHandler.request<{
            success: boolean;
        }>(WebviewMessageId.requestState, stateId);
        return { ...result, stateId };
    };

    return await Promise.race([
        Promise.all([
            wrapper(StateId.Accounts),
            wrapper(StateId.DeployedContracts),
            wrapper(StateId.CompiledContracts),
            wrapper(StateId.Chain),
            wrapper(StateId.App)
        ]),
        timeout
    ])
        .then((results) => {
            if (
                !(results as { success: boolean; stateId: StateId }[]).every(
                    (result) => result.success
                )
            ) {
                for (const result of results as { success: boolean; stateId: StateId }[]) {
                    if (!result.success) {
                        console.error('Failed to load state', result.stateId);
                    }
                }
                return false;
            }
            return true;
        })
        .catch((_) => {
            console.error('Requesting state from the extension timed out');
            return false;
        });
}

export function setupListeners() {
    window.addEventListener('message', (event) => {
        const message = event.data as WebviewMessageResponse;

        // console.log('received message', message);

        switch (message.command) {
            case WebviewMessageId.getState: {
                if (message.stateId === StateId.DeployedContracts) {
                    if (message.payload === undefined) {
                        return;
                    }
                    deployedContracts.set(message.payload);
                }

                if (message.stateId === StateId.CompiledContracts) {
                    if (message.payload === undefined) {
                        return;
                    }
                    compilationState.set(message.payload);
                    return;
                }

                if (message.stateId === StateId.Accounts) {
                    const _accounts = message.payload as AccountState;
                    const _selectedAccount = get(selectedAccount);

                    // update accounts store
                    accounts.set(_accounts);

                    // if no accounts, reset selected account
                    if (_accounts.length === 0) {
                        setSelectedAccount(null);
                        return;
                    }

                    // check if selected account is still in the list, if not select the first account
                    if (
                        _selectedAccount === null ||
                        (_selectedAccount !== null &&
                            !_accounts.some(
                                (account) => account.address === _selectedAccount.address
                            ))
                    ) {
                        setSelectedAccount(0);
                        return;
                    }

                    // if selectedAccount is in payload, update selectedAccount
                    // @dev accounts.find should not return undefined, since checked above
                    if (_selectedAccount !== null) {
                        setSelectedAccount(
                            _accounts.findIndex(
                                (account) => account.address === _selectedAccount.address
                            ) ?? null
                        );
                    }

                    return;
                }

                if (message.stateId === StateId.Chain) {
                    if (message.payload === undefined) {
                        return;
                    }
                    chainState.set(message.payload);
                    return;
                }

                if (message.stateId === StateId.App) {
                    if (message.payload === undefined) {
                        return;
                    }

                    appState.set(message.payload);
                    return;
                }

                break;
            }
        }
    });
}
