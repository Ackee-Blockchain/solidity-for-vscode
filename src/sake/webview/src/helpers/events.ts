import { messageHandler } from '@estruyf/vscode/dist/client';
import { withTimeout } from './helpers';
import {
    SignalType,
    WebviewMessageId,
    type WebviewMessageResponse
} from '../../shared/messaging_types';
import { RESTART_WAKE_SERVER_TIMEOUT } from './constants';
import {
    accounts,
    appState,
    chainState,
    compilationState,
    deployedContracts,
    selectedAccount,
    setSelectedAccount
} from './stores';
import { StateId, type AccountState } from '../../shared/state_types';
import { get } from 'svelte/store';

export function requestAppState(): Promise<boolean> {
    return requestState([StateId.App]);
}

export function requestChainState(): Promise<boolean> {
    return requestState([StateId.Chain]);
}

export function requestSharedState(): Promise<boolean> {
    return requestState([StateId.Chain, StateId.App]);
}

export function requestLocalState(): Promise<boolean> {
    return requestState([StateId.Accounts, StateId.DeployedContracts, StateId.CompiledContracts]);
}

async function requestState(stateIds: StateId[]): Promise<boolean> {
    const wrapper = async (stateId: StateId) => {
        const result = await messageHandler.request<{
            success: boolean;
        }>(WebviewMessageId.requestState, stateId);
        return { ...result, stateId };
    };

    return await Promise.all(stateIds.map((id) => wrapper(id)))
        .then((results) => {
            if (!results.every((result) => result.success)) {
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
            case WebviewMessageId.onSignal: {
                if (message.payload === undefined) {
                    return;
                }

                const { signal } = message.payload;

                if (signal === SignalType.showAdvancedLocalChainSetup) {
                    // showAdvancedLocalChainSetup();
                }
                break;
            }

            case WebviewMessageId.onGetState: {
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
                                (account: { address: any }) =>
                                    account.address === _selectedAccount.address
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
                                (account: { address: any }) =>
                                    account.address === _selectedAccount.address
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
                    // console.log('received appState', message.payload);
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

export async function restartWakeServer(): Promise<boolean> {
    return withTimeout(
        messageHandler.request<{
            success: boolean;
        }>(WebviewMessageId.restartWakeServer, {}),
        RESTART_WAKE_SERVER_TIMEOUT
    )
        .then((result) => {
            return (result as { success: boolean }).success;
        })
        .catch((_) => {
            console.error('Requesting state from the extension timed out');
            return false;
        });
}
