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
import { REQUEST_STATE_TIMEOUT } from './constants';

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

export async function requestState(): Promise<boolean> {
    const timeout = new Promise<void>((_, reject) =>
        setTimeout(() => reject(new Error('Request timed out')), REQUEST_STATE_TIMEOUT)
    );

    return await Promise.race([
        Promise.all([
            messageHandler.request<boolean>(WebviewMessageId.requestState, StateId.Accounts),
            messageHandler.request<boolean>(
                WebviewMessageId.requestState,
                StateId.DeployedContracts
            ),
            messageHandler.request<boolean>(
                WebviewMessageId.requestState,
                StateId.CompiledContracts
            ),
            messageHandler.request<boolean>(WebviewMessageId.requestState, StateId.Chains)
        ]),
        timeout
    ])
        .then((results) => {
            if (!(results as boolean[]).every((result) => result)) {
                console.error('requestState failed');
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
        if (!event.data.command) {
            return;
        }

        const { command, payload, stateId } = event.data;

        // console.log('received message', command, payload, stateId);

        switch (command) {
            case WebviewMessageId.getState: {
                if (stateId === StateId.DeployedContracts) {
                    if (payload === undefined) {
                        return;
                    }
                    deployedContracts.set(payload);
                }

                if (stateId === StateId.CompiledContracts) {
                    console.log('got compiled contracts', payload);
                    if (payload === undefined) {
                        return;
                    }
                    compilationState.set(payload);
                    return;
                }

                if (stateId === StateId.Accounts) {
                    console.log('got accounts', payload);
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
                    sharedChainState.set(payload);
                    return;
                }

                break;
            }
        }
    });
}
