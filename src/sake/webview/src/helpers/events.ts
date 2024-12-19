import { messageHandler } from '@estruyf/vscode/dist/client';
import { withTimeout } from './helpers';
import {
    SignalId,
    WebviewMessageId,
    type WebviewMessageResponse
} from '../../shared/messaging_types';
import { RESTART_WAKE_SERVER_TIMEOUT } from './constants';
import {
    accounts,
    appState,
    chainNavigator,
    chainState,
    compilationState,
    deployedContracts,
    selectedAccount,
    setSelectedAccount
} from './stores';
import { StateId, type AccountState } from '../../shared/state_types';
import { get } from 'svelte/store';

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

        console.log('message', message);

        switch (message.command) {
            case WebviewMessageId.onGetState: {
                handleStateResponse(message);
                break;
            }

            case WebviewMessageId.onSignal: {
                handleSignal(message);
                break;
            }

            // @dev some events might be caught by messageHandlers and are not intended for the webview
            // such messages originated in the webview
            // only events sent from the extension are handled here
            // default: {
            //     console.error(`No listener set up for message with id ${message.command}`);
            //     break;
            // }
        }
    });
}

function handleStateResponse(
    message: WebviewMessageResponse & { command: WebviewMessageId.onGetState }
) {
    switch (message.stateId) {
        case StateId.DeployedContracts: {
            deployedContracts.set(message.payload);
            break;
        }

        case StateId.CompiledContracts: {
            compilationState.set(message.payload);
            break;
        }

        case StateId.Accounts: {
            const _accounts = message.payload as AccountState;
            const _selectedAccount = get(selectedAccount);

            // update accounts store
            accounts.set(_accounts);

            // if no accounts, reset selected account
            if (_accounts.length === 0) {
                setSelectedAccount(null);
                break;
            }

            // check if selected account is still in the list, if not select the first account
            if (
                _selectedAccount === null ||
                (_selectedAccount !== null &&
                    !_accounts.some(
                        (account: { address: any }) => account.address === _selectedAccount.address
                    ))
            ) {
                setSelectedAccount(0);
                break;
            }

            // if selectedAccount is in payload, update selectedAccount
            // @dev accounts.find should not return undefined, since checked above
            if (_selectedAccount !== null) {
                setSelectedAccount(
                    _accounts.findIndex(
                        (account: { address: any }) => account.address === _selectedAccount.address
                    ) ?? null
                );
            }
            break;
        }

        case StateId.Chain: {
            chainState.set(message.payload);
            break;
        }

        case StateId.App: {
            appState.set(message.payload);
            break;
        }
    }
}

function handleSignal(message: WebviewMessageResponse & { command: WebviewMessageId.onSignal }) {
    switch (message.signalId) {
        case SignalId.showAdvancedLocalChainSetup: {
            chainNavigator.showAdvancedLocalChainSetup();

            break;
        }
    }
}
