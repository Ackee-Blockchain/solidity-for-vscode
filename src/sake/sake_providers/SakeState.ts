import { AccountStateProvider } from '../state/AccountStateProvider';
import { DeploymentStateProvider } from '../state/DeploymentStateProvider';
import { CompilationStateProvider } from '../state/CompilationStateProvider';
import { BaseWebviewProvider } from '../providers/BaseWebviewProvider';
import { TransactionHistoryStateProvider } from '../state/TransactionHistoryStateProvider';
import { AppStateProvider } from '../state/AppStateProvider';
import { SakeContext } from '../context';
import { ChainStateProvider } from '../state/ChainStateProvider';
import { ProviderState, SharedState } from '../webview/shared/storage_types';
import {
    AccountState,
    DeploymentState,
    TransactionHistoryState
} from '../webview/shared/state_types';

export class SakeState {
    accounts: AccountStateProvider;
    deployment: DeploymentStateProvider;
    compilation: CompilationStateProvider;
    history: TransactionHistoryStateProvider;
    chains: ChainStateProvider;
    app: AppStateProvider;
    subscribed: boolean;

    private get _webviewProvider(): BaseWebviewProvider {
        return SakeContext.getInstance().webviewProvider;
    }

    constructor() {
        // network-specific state
        this.accounts = new AccountStateProvider();
        this.deployment = new DeploymentStateProvider();
        this.history = new TransactionHistoryStateProvider();

        // shared state
        this.compilation = CompilationStateProvider.getInstance();
        this.chains = ChainStateProvider.getInstance();
        this.app = AppStateProvider.getInstance();

        this.subscribed = false;
    }

    subscribe() {
        this.accounts.subscribe(this._webviewProvider);
        this.deployment.subscribe(this._webviewProvider);
        this.history.subscribe(this._webviewProvider);
        this.chains.subscribe(this._webviewProvider);
        this.compilation.subscribe(this._webviewProvider);
        this.app.subscribe(this._webviewProvider);

        this.subscribed = true;
    }

    unsubscribe() {
        this.accounts.unsubscribe(this._webviewProvider);
        this.deployment.unsubscribe(this._webviewProvider);
        this.history.unsubscribe(this._webviewProvider);
        this.chains.unsubscribe(this._webviewProvider);
        this.compilation.unsubscribe(this._webviewProvider);
        this.app.unsubscribe(this._webviewProvider);

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
            chains: ChainStateProvider.getInstance().state,
            compilation: CompilationStateProvider.getInstance().state
        };
    }

    static loadSharedState(state: SharedState) {
        ChainStateProvider.getInstance().state = state.chains;
        CompilationStateProvider.getInstance().state = state.compilation;
    }
}
