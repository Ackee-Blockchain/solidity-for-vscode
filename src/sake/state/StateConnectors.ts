import { BaseWebviewProvider } from '../providers/BaseWebviewProvider';
import {
    AccountState,
    AppState,
    ChainState,
    CompilationState,
    DeploymentState,
    StateId,
    TransactionHistoryState,
    WebviewMessageId
} from '../webview/shared/types';
import { appState } from './shared/AppState';
import { chainRegistry } from './shared/ChainRegistry';
import { compilationState } from './shared/CompilationState';
import { extensionState } from './shared/ExtensionState';

export abstract class BaseStateConnector<T> {
    private _subscriptions: BaseWebviewProvider[] = [];
    protected _state: T | undefined;

    protected constructor(public readonly stateId: StateId) {
        this.registerConnection();
    }

    protected abstract registerConnection(): void;

    protected get state(): T | undefined {
        return this._state;
    }

    protected set state(state: T) {
        this._state = state;
        this._sendUpdateMessage();
    }

    public subscribe(provider: BaseWebviewProvider) {
        if (!this._subscriptions.includes(provider)) {
            this._subscriptions.push(provider);
            provider.setSubscribedState(this);
        }
    }

    public unsubscribe(provider: BaseWebviewProvider) {
        if (this._subscriptions.includes(provider)) {
            this._subscriptions = this._subscriptions.filter((p) => p !== provider);
            provider.unsetSubscribedState(this);
        }
    }

    protected _sendUpdateMessage() {
        this._subscriptions.forEach((provider) => {
            provider.postMessageToWebview({
                command: WebviewMessageId.onGetState,
                payload: this.state,
                stateId: this.stateId
            });
        });
    }

    public sendToWebview() {
        this._sendUpdateMessage();
    }
}

/* Connectors */

class AccountConnector extends BaseStateConnector<AccountState> {
    private _hookSubscription: (() => void) | undefined;

    constructor() {
        super(StateId.Accounts);

        // @dev to avoid race conditions, request state duplicately
        const currentChainId = extensionState.get().currentChainId;
        if (!currentChainId) {
            return;
        }
        this.state = chainRegistry.get(currentChainId)?.chainState.accounts.get() ?? [];
    }

    protected registerConnection(): void {
        extensionState.subscribe((state) => {
            if (!state.currentChainId) {
                return;
            }
            if (this._hookSubscription) {
                this._hookSubscription();
            }
            this.state = chainRegistry.get(state.currentChainId)?.chainState.accounts.get() ?? [];
            this._hookSubscription = chainRegistry
                .get(state.currentChainId)
                ?.chainState.accounts.subscribe((state) => {
                    this.state = state;
                });
        });
    }
}

class DeploymentConnector extends BaseStateConnector<DeploymentState> {
    private _hookSubscription: (() => void) | undefined;
    constructor() {
        super(StateId.DeployedContracts);

        // @dev to avoid race conditions, request state duplicately
        const currentChainId = extensionState.get().currentChainId;
        if (!currentChainId) {
            return;
        }
        this.state = chainRegistry.get(currentChainId)?.chainState.deployment.get() ?? [];
    }

    protected registerConnection(): void {
        extensionState.subscribe((state) => {
            if (!state.currentChainId) {
                return;
            }
            if (this._hookSubscription) {
                this._hookSubscription();
            }
            this.state = chainRegistry.get(state.currentChainId)?.chainState.deployment.get() ?? [];
            this._hookSubscription = chainRegistry
                .get(state.currentChainId)
                ?.chainState.deployment.subscribe((state) => {
                    this.state = state;
                });
        });
    }
}

class HistoryConnector extends BaseStateConnector<TransactionHistoryState> {
    private _hookSubscription: (() => void) | undefined;

    constructor() {
        super(StateId.TransactionHistory);

        // @dev to avoid race conditions, request state duplicately
        const currentChainId = extensionState.get().currentChainId;
        if (!currentChainId) {
            return;
        }
        this.state = chainRegistry.get(currentChainId)?.chainState.history.get() ?? [];
    }

    protected registerConnection(): void {
        extensionState.subscribe((state) => {
            if (!state.currentChainId) {
                return;
            }
            if (this._hookSubscription) {
                this._hookSubscription();
            }
            this.state = chainRegistry.get(state.currentChainId)?.chainState.history.get() ?? [];
            this._hookSubscription = chainRegistry
                .get(state.currentChainId)
                ?.chainState.history.subscribe((state) => {
                    this.state = state;
                });
        });
    }
}

/* Shared State Connectors */

class CompilationConnector extends BaseStateConnector<CompilationState> {
    constructor() {
        super(StateId.CompiledContracts);

        // @dev to avoid race conditions, request state duplicately
        const currentChainId = extensionState.get().currentChainId;
        if (!currentChainId) {
            return;
        }
        this.state = chainRegistry.get(currentChainId)?.chainState.compilation.get() ?? {
            contracts: [],
            issues: [],
            dirty: true
        };
    }

    protected registerConnection(): void {
        compilationState.subscribe((state) => {
            this.state = state;
        });
    }
}

class ChainStateConnector extends BaseStateConnector<ChainState> {
    constructor() {
        super(StateId.Chain);

        const _extensionState = extensionState.get();

        // @dev to avoid race conditions, request state duplicately
        this.state = {
            chains: chainRegistry.getAll().map((provider) => {
                const providerState = provider.providerState;
                return {
                    type: provider.type,
                    chainId: providerState.id,
                    chainName: providerState.name,
                    network: providerState.network.getInfo(),
                    connected: providerState.connected,
                    persistence: providerState.persistence
                };
            }),
            currentChainId: _extensionState.currentChainId,
            defaultPreconfigs: _extensionState.defaultPreconfigs
        };
    }

    protected registerConnection(): void {
        chainRegistry.subscribe(() => {
            this.state = {
                ...(this.state ?? { chains: [], currentChainId: undefined, defaultPreconfigs: [] }),
                chains: chainRegistry.getAll().map((provider) => {
                    const providerState = provider.providerState;
                    return {
                        type: provider.type,
                        chainId: providerState.id,
                        chainName: providerState.name,
                        network: providerState.network.getInfo(),
                        connected: providerState.connected,
                        persistence: providerState.persistence
                    };
                })
            };
        });

        extensionState.subscribe((state) => {
            this.state = {
                ...(this.state ?? { chains: [], currentChainId: undefined, defaultPreconfigs: [] }),
                ...state
            };
        });
    }
}

class AppConnector extends BaseStateConnector<AppState> {
    constructor() {
        super(StateId.App);

        this.state = appState.get();
    }

    protected registerConnection(): void {
        appState.subscribe((state) => {
            this.state = state;
        });
    }
}

const accountConnector = new AccountConnector();
const deploymentConnector = new DeploymentConnector();
const historyConnector = new HistoryConnector();
const compilationConnector = new CompilationConnector();
const chainStateConnector = new ChainStateConnector();
const appConnector = new AppConnector();

export {
    accountConnector,
    appConnector,
    chainStateConnector,
    compilationConnector,
    deploymentConnector,
    historyConnector
};
