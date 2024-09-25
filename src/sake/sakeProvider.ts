import { Account, AccountState, Contract } from './webview/shared/types';

import { INetworkProvider } from './network/networks';
import { AccountStateProvider } from './state/AccountStateProvider';
import { DeploymentStateProvider } from './state/DeploymentStateProvider';
import { CompilationStateProvider } from './state/CompilationStateProvider';
import { BaseWebviewProvider } from './providers/BaseWebviewProvider';
import { TransactionHistoryStateProvider } from './state/TransactionHistoryStateProvider';
import { WakeStateProvider } from './state/WakeStateProvider';
import { assert } from 'console';

export interface ISakeProvider {
    accounts: Promise<string[]>;
    getDeployedContracts: () => Promise<string[]>;
    getContract: (address: string) => Promise<Contract>;
}

export class SakeState {
    accounts: AccountStateProvider;
    deployedContracts: DeploymentStateProvider;
    compiledContracts: CompilationStateProvider;
    history: TransactionHistoryStateProvider;
    wake: WakeStateProvider;

    constructor(private _webviewProvider: BaseWebviewProvider) {
        // network-specific state
        this.accounts = new AccountStateProvider();
        this.deployedContracts = new DeploymentStateProvider();
        this.history = new TransactionHistoryStateProvider();

        // shared state
        this.compiledContracts = CompilationStateProvider.getInstance();
        this.wake = WakeStateProvider.getInstance();
    }

    subscribe() {
        this.accounts.subscribe(this._webviewProvider);
        this.deployedContracts.subscribe(this._webviewProvider);
        this.history.subscribe(this._webviewProvider);
    }

    unsubscribe() {
        this.accounts.unsubscribe(this._webviewProvider);
        this.deployedContracts.unsubscribe(this._webviewProvider);
        this.history.unsubscribe(this._webviewProvider);
    }
}

export interface SakeState {
    network: INetworkProvider;
    state: SakeState;
}

export

export abstract class GenericSakeProvider {
    abstract initialize(): Promise<void>;

    /* Account management */

    async addAccount(address: string) {
        // check if account is already in the list
        if (this.state.accounts.includes(address)) {
            return;
        }

        // get data from network
        const account: Account | undefined = await this.network.registerAccount(address);

        if (account) {
            this.state.accounts.add(account);
        }
    }

    async removeAccount(address: string) {
        this.state.accounts.remove(address);
    }

    async setAccountBalance(address: string, balance: number) {
        const success = this.network.setAccountBalance(address, balance);

        if (success) {
            this.state.accounts.setBalance(address, balance);
        }
    }

    async setAccountNickname(address: string, nickname: string) {
        this.state.accounts.setNickname(address, nickname);
    }

    /* Deployment management */

    async deployContract(contract: string) {
        const success = this.network.deployContract(contract);

        if (success) {
            this.state.deployedContracts.add(contract);
        }
    }

    async removeDeployedContract(contract: string) {
        this.state.deployedContracts.remove(contract);
    }

    async getDeployedContracts(): Promise<string[]> {
        return this._networkProvider.getDeployedContracts();
    }

    async getContract(address: string): Promise<Contract> {
        return this._networkProvider.getContract(address);
    }

    // abstract methods
    abstract get network(): INetworkProvider;
    abstract get state(): SakeState;
}

export class LocalNodeSakeProvider extends GenericSakeProvider {
    constructor() {
        super();
        _network =
    }

    async initialize() {
        // TODO preload accounts
    }

    get network(): INetworkProvider {
        return new LocalNodeNetworkProvider();
    }

    get state(): SakeState {
        return new SakeState();
    }
}

export class SakeProvider extends GenericSakeProvider {
    private _state!: SakeState;

    private networkMap = new Map<
        string,
        {
            _networkProvider: INetworkProvider;
            _state: SakeState;
        }
    >();

    constructor(
        private _networkProvider: INetworkProvider,
        private _webviewProvider: BaseWebviewProvider
    ) {
        super();
        this.setNetwork(_networkProvider);
    }

    setNetwork(network: INetworkProvider) {
        const prevState = this.state;
        const prevNetwork = this.network;

        // create a new state for the network
        if (!this.networkMap.has(network.id)) {
            this.networkMap.set(network.id, {
                _networkProvider: network,
                _state: new SakeState(this._webviewProvider)
            });
        }

        const newState = this.networkMap.get(network.id)!._state;
        const newNetwork = network;
        assert(newState !== undefined, 'State is undefined');
        assert(newNetwork !== undefined, 'Network provider is undefined');

        // set the network and state
        this._state = newState;
        this._networkProvider = newNetwork;

        // change subscriptions
        prevState.unsubscribe();
        newState.subscribe();

        // notify webviews of the switch
        // TODO
    }

    get network(): INetworkProvider {
        return this._networkProvider;
    }

    get state(): SakeState {
        return this._state;
    }
}
