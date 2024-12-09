import { writable, derived, get } from 'svelte/store';
import {
    type AccountState,
    type AppState,
    type ChainState,
    type CompilationState,
    type DeploymentState,
    type NetworkCreationConfiguration
} from '../../shared/types';
import { parseComplexNumber } from '../../shared/validate';

/**
 * Extension data
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
    isOpenWorkspace: undefined,
    initializationState: undefined
});
export const chainState = writable<ChainState>({
    chains: [],
    currentChainId: undefined
});
export const currentChain = derived(chainState, ($chainState) => {
    return $chainState.chains.find((chain) => chain.chainId === $chainState.currentChainId);
});

/**
 * Webview Stores
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
        return BigInt(0);
    }
    try {
        return parseComplexNumber($selectedValueString);
    } catch (e) {
        return null;
    }
});
export const compilationIssuesVisible = writable<boolean>(false);
compilationState.subscribe((state) => {
    // If compilation issues are visible but there are no issues, hide them
    if (get(compilationIssuesVisible) && state.issues.length === 0) {
        compilationIssuesVisible.set(false);
    }
});
export const activeTabId = writable<number>(0);
export const txParametersExpanded = writable<boolean>(true);

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

/* Chain Navigator */
type BaseChainNavigatorState = {
    state: string;
    expanded: boolean;
};

type ChainNavigatorState =
    | (BaseChainNavigatorState & {
          state: 'default';
      })
    | (BaseChainNavigatorState & {
          state: 'advancedLocalChainSetup';
          expanded: true;
          config?: NetworkCreationConfiguration;
          activeTab: 'create' | 'connect';
      });

export const chainNavigator = (() => {
    const { subscribe, set } = writable<ChainNavigatorState>({
        // state: 'default',
        // expanded: false,
        state: 'default',
        expanded: false
    });

    return {
        subscribe,
        showAdvancedLocalChainSetup: (activeTab: 'create' | 'connect' = 'create') => {
            set({
                state: 'advancedLocalChainSetup',
                config: undefined,
                activeTab,
                expanded: true
            });
        },
        clear: () => {
            set({
                state: 'default',
                expanded: false
            });
        },
        toggleExpanded: () => {
            const state = get(chainNavigator);
            if (state.state === 'default') {
                set({ ...state, expanded: !state.expanded });
            }
        },
        setActiveTab: (tab: 'create' | 'connect') => {
            const state = get(chainNavigator);
            if (state.state === 'advancedLocalChainSetup') {
                set({ ...state, activeTab: tab });
            }
        }
    };
})();
