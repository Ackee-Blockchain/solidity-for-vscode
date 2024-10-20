import { writable, get, derived, readable } from 'svelte/store';
import type { AccountState, ExtendedAccount } from '../../shared/types';
import { parseComplexNumber } from '../../shared/validate';
import { accounts, appState } from './sakeStore';

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

export const loadedState = writable<boolean | undefined>(undefined);

export const extensionInitialized = (() => {
    const { subscribe, set } = writable<boolean | undefined>(undefined);

    return {
        subscribe,
        update: () => {
            const currentState = get({ subscribe });
            const currentAppState = get(appState);

            if (currentState === undefined && currentAppState.isInitialized) {
                loadedState.set(true);
                set(true);
            }
        }
    };
})();
