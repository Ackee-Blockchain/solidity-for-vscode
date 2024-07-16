import { writable, get, derived } from 'svelte/store';
import {
    StateId,
    WebviewMessage,
    type AccountStateData,
    type CompilationStateData,
    type CompiledContract,
    type DeploymentStateData
} from '../../shared/types';
import { messageHandler } from '@estruyf/vscode/dist/client';
import { parseComplexNumber } from '../../shared/validate';

/**
 * frontend svelte data
 */

export const selectedAccount = writable<AccountStateData | null>(null);
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

/**
 * backend data
 */

export const accounts = writable<AccountStateData[]>([]);
export const deployedContracts = writable<DeploymentStateData[]>([]);
export const compilationState = writable<CompilationStateData>({
    contracts: [],
    dirty: true
});

/**
 * setup stores
 */

export async function setupStores() {
    setupListeners();
    await init();
}

async function init() {
    await messageHandler.request(WebviewMessage.onGetAccounts);
    await messageHandler.request(WebviewMessage.getState, StateId.DeployedContracts);
    await messageHandler.request(WebviewMessage.getState, StateId.CompiledContracts);
}

function setupListeners() {
    window.addEventListener('message', (event) => {
        if (!event.data.command) {
            return;
        }

        const { command, payload, stateId } = event.data;

        switch (command) {
            case WebviewMessage.getState: {
                if (stateId === StateId.DeployedContracts) {
                    // console.log('deployed contracts', payload);
                    if (payload === undefined) {
                        return;
                    }
                    deployedContracts.set(payload);
                }

                if (stateId === StateId.CompiledContracts) {
                    // console.log('compiled contracts', payload);
                    if (payload === undefined) {
                        return;
                    }
                    compilationState.set(payload);
                    return;
                }

                if (stateId === StateId.Accounts) {
                    // console.log('accounts', payload);
                    const _accounts = payload as AccountStateData[];
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

                break;
            }
        }
    });
}
