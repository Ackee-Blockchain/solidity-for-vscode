import { writable, get, derived, readable } from 'svelte/store';
import type { AccountState, ExtendedAccount } from '../../shared/types';
import { parseComplexNumber } from '../../shared/validate';
import { accounts, appState, requestAppState } from './sakeStore';
import { REQUEST_STATE_TIMEOUT } from '../helpers/constants';
import { withTimeout } from '../helpers/helpers';

/**
 * App Stores
 */

export const selectedAccountId = writable<number | null>(null);
export const selectedAccount = derived(
    [selectedAccountId, accounts],
    ([$selectedAccountId, $accounts]) => {
        if ($selectedAccountId === null) {
            return null;
        }
        return $accounts[$selectedAccountId];
    }
);
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
export const activeTabId = writable<number>(0);
export const txParametersExpanded = writable<boolean>(true);
export const chainStatusExpanded = writable<boolean>(false);

export const setSelectedAccount = (accountId: number | null) => {
    selectedAccountId.set(accountId);
};

/* Loading */
export const loadingShown = writable<boolean>(false);
export const loadingMessage = writable<string | null>(null);

// Extension connection state
// 'connecting' - waiting for communication with extension is established
// 'ready' - extension returned true to get AppState request
// 'timedOut' - communication with extension timed out
type ExtensionConnectionState = 'connecting' | 'connected' | 'failed';
export const extensionConnectionState = (() => {
    const { subscribe, set } = writable<ExtensionConnectionState>('connecting');

    // Only allow setting if current state is 'connecting'
    return {
        subscribe,
        set: (value: ExtensionConnectionState) => {
            // Only allow setting if current state is 'connecting'
            const currentState = get(extensionConnectionState);
            if (currentState !== 'connected') {
                set(value);
            }
        }
    };
})();

type StateLoadState = 'loading' | 'loaded' | 'failed';
export const stateLoadState = writable<StateLoadState>('loading');
