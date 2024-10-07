import { writable, get, derived } from 'svelte/store';
import {
    StateId,
    WebviewMessageId,
    type AccountState,
    type CompilationState,
    type DeploymentState,
    type ExtendedAccount,
    type SharedChainState
} from '../../shared/types';
import { messageHandler } from '@estruyf/vscode/dist/client';
import { parseComplexNumber } from '../../shared/validate';

/**
 * frontend svelte data
 */

export const selectedAccount = writable<ExtendedAccount | null>(null);
export const selectedValueString = writable<string | null>(null);
// null indicated wrong stirng input
export const selectedValue = derived(selectedValueString, ($selectedValueString) => {
    if ($selectedValueString === null || $selectedValueString === '') {
        return 0;
    }
    try {
        return parseComplexNumber($selectedValueString);
    } catch (e) {
        return null;
    }
});
export const compilationIssuesVisible = writable<boolean>(false);
export const activeTab = writable<number>();

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
export const sharedChainState = writable<SharedChainState>({
    isAnvilInstalled: undefined,
    isWakeServerRunning: undefined,
    chains: [],
    currentChainId: undefined
});

/**
 * setup stores
 */

export async function requestState() {
    // TODO fix
    console.log('requestState');
    await messageHandler.request(WebviewMessageId.getState, StateId.Accounts);
    await messageHandler.request(WebviewMessageId.getState, StateId.DeployedContracts);
    await messageHandler.request(WebviewMessageId.getState, StateId.CompiledContracts);
    await messageHandler.request(WebviewMessageId.getState, StateId.Chains);
}

export function setupListeners() {
    window.addEventListener('message', (event) => {
        if (!event.data.command) {
            return;
        }

        const { command, payload, stateId } = event.data;

        switch (command) {
            case WebviewMessageId.getState: {
                if (stateId === StateId.DeployedContracts) {
                    if (payload === undefined) {
                        return;
                    }
                    deployedContracts.set(payload);
                }

                if (stateId === StateId.CompiledContracts) {
                    if (payload === undefined) {
                        return;
                    }
                    compilationState.set(payload);
                    return;
                }

                if (stateId === StateId.Accounts) {
                    const _accounts = payload as AccountState;
                    const _selectedAccount = get(selectedAccount);

                    // update accounts store
                    accounts.set(_accounts);

                    // if no accounts, reset selected account
                    if (_accounts.length === 0) {
                        selectedAccount.set(null);
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
                        selectedAccount.set(_accounts[0]);
                        return;
                    }

                    // if selectedAccount is in payload, update selectedAccount
                    // @dev accounts.find should not return undefined, since checked above
                    if (_selectedAccount !== null) {
                        selectedAccount.set(
                            _accounts.find(
                                (account) => account.address === _selectedAccount.address
                            ) ?? null
                        );
                    }

                    return;
                }

                if (stateId === StateId.Chains) {
                    if (payload === undefined) {
                        return;
                    }
                    console.log('state chains in webview', payload);
                    sharedChainState.set(payload);
                    return;
                }

                break;
            }
        }
    });
}
