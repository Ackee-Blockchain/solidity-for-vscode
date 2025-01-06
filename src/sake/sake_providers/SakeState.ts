import { SakeContext } from '../context';
import { BaseWebviewProvider } from '../providers/BaseWebviewProvider';
import AccountStateProvider from '../state/AccountStateProvider';
import CompilationStateProvider from '../state/CompilationStateProvider';
import DeploymentStateProvider from '../state/DeploymentStateProvider';
import { ChainStateProvider } from '../state/HookStateConnectors';
import TransactionHistoryStateProvider from '../state/TransactionHistoryStateProvider';
import { fingerprint } from '../utils/hash';
import {
    AccountState,
    DeploymentState,
    TransactionHistoryState
} from '../webview/shared/state_types';
import { SharedState } from '../webview/shared/storage_types';

export default class SakeState {
    accounts: AccountStateProvider;
    deployment: DeploymentStateProvider;
    compilation: CompilationStateProvider;
    history: TransactionHistoryStateProvider;
    chains: ChainStateProvider;
    subscribed: boolean;

    private get _webviewProvider(): BaseWebviewProvider {
        const _webviewProvider = SakeContext.getInstance().webviewProvider;
        if (_webviewProvider === undefined) {
            throw Error();
        }
        return _webviewProvider;
    }

    constructor() {
        // network-specific state
        this.accounts = new AccountStateProvider();
        this.deployment = new DeploymentStateProvider();
        this.history = new TransactionHistoryStateProvider();

        // shared state
        this.compilation = CompilationStateProvider.getInstance();
        this.chains = ChainStateProvider.getInstance();

        this.subscribed = false;
    }

    subscribe() {
        this.accounts.subscribe(this._webviewProvider);
        this.deployment.subscribe(this._webviewProvider);
        this.history.subscribe(this._webviewProvider);

        this.subscribed = true;
    }

    unsubscribe() {
        this.accounts.unsubscribe(this._webviewProvider);
        this.deployment.unsubscribe(this._webviewProvider);
        this.history.unsubscribe(this._webviewProvider);

        this.subscribed = false;
    }

    sendToWebview() {
        if (!this.subscribed) {
            console.error('Cannot force state update, webview not subscribed');
            return;
        }

        this.accounts.sendToWebview();
        this.deployment.sendToWebview();
        this.history.sendToWebview();
        this.chains.sendToWebview();
        this.compilation.sendToWebview();
    }

    dumpProviderState() {
        return {
            accounts: this.accounts.state,
            deployment: this.deployment.state,
            history: this.history.state
        };
    }

    loadProviderState(state: {
        accounts: AccountState;
        deployment: DeploymentState;
        history: TransactionHistoryState;
    }) {
        this.accounts.state = state.accounts;
        this.deployment.state = state.deployment;
        this.history.state = state.history;
    }

    static dumpSharedState() {
        // app state is not dumped, since it is loaded on extension activation
        return {
            // @dev chain state should not be dumped as it jsut stored
            // chains: ChainStateProvider.getInstance().state
            // compilation: CompilationStateProvider.getInstance().state
        };
    }

    static loadSharedState(state: SharedState) {
        // ChainStateProvider.getInstance().state = state.chains;
        // @hotfix: compilation state is not loaded until wake is able to save it in state dump
        // CompilationStateProvider.getInstance().state = state.compilation;
    }

    fingerprint() {
        return fingerprint(this.dumpProviderState());
    }
}
