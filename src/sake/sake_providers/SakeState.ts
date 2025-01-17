import { AccountStateProvider } from '../state/local/AccountState';
import { compilationState, CompilationStateProvider } from '../state/shared/CompilationState';
import { DeploymentStateProvider } from '../state/local/DeploymentState';
import { TransactionHistoryStateProvider } from '../state/local/TransactionHistoryState';
import { fingerprint } from '../utils/hash';
import {
    AccountState,
    DeploymentState,
    TransactionHistoryState
} from '../webview/shared/state_types';
import { SharedState } from '../webview/shared/storage_types';
import { extensionState } from '../state/shared/ExtensionState';
import { chainRegistry } from '../state/shared/ChainRegistry';
import sakeProviderManager from './SakeProviderManager';

export default class SakeState {
    accounts: AccountStateProvider;
    deployment: DeploymentStateProvider;
    compilation: CompilationStateProvider;
    history: TransactionHistoryStateProvider;

    constructor() {
        // network-specific state
        this.accounts = new AccountStateProvider();
        this.deployment = new DeploymentStateProvider();
        this.history = new TransactionHistoryStateProvider();

        // shared state
        this.compilation = compilationState;
    }

    dumpState() {
        return {
            accounts: this.accounts.get(),
            deployment: this.deployment.get(),
            history: this.history.get()
        };
    }

    loadStateFrom(state: {
        accounts?: AccountState;
        deployment?: DeploymentState;
        history?: TransactionHistoryState;
    }) {
        if (state.accounts) {
            this.accounts.set(state.accounts);
        }
        if (state.deployment) {
            this.deployment.set(state.deployment);
        }
        if (state.history) {
            this.history.set(state.history);
        }
    }

    reset() {
        // destroy old
        this.accounts.reset();
        this.deployment.reset();
        this.history.reset();
    }

    // @todo move otuside of this class
    static dumpSharedState(): SharedState {
        // app state is not dumped, since it is loaded on extension activation
        return {
            lastUsedChain: extensionState.get().currentChainId
            // @dev chain state should not be dumped as it jsut stored
            // chains: ChainStateProvider.getInstance().state
            // compilation: CompilationStateProvider.getInstance().state
        };
    }

    // @todo move otuside of this class
    static loadSharedState(state: SharedState) {
        if (state.lastUsedChain) {
            try {
                sakeProviderManager.setProvider(state.lastUsedChain);
            } catch (e) {}
        }
        // ChainStateProvider.getInstance().state = state.chains;
        // @hotfix: compilation state is not loaded until wake is able to save it in state dump
        // CompilationStateProvider.getInstance().state = state.compilation;
    }

    fingerprint() {
        return fingerprint(this.dumpState());
    }
}
