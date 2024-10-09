import { writable, get, derived } from 'svelte/store';
import type { AccountStateData } from '../../shared/types';
import { parseComplexNumber } from '../../shared/validate';

/**
 * App Stores
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
export const compilationIssuesVisible = writable<boolean>(false);
export const activeTabId = writable<number>();
export const txParametersExpanded = writable<boolean>(false);
