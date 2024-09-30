import { CallRequest, DeploymentRequest } from '../webview/shared/types';

import { INetworkProvider, LocalNodeNetworkProvider } from '../network/networks';
import { AccountStateProvider } from '../state/AccountStateProvider';
import { DeploymentStateProvider } from '../state/DeploymentStateProvider';
import { CompilationStateProvider } from '../state/CompilationStateProvider';
import { BaseWebviewProvider } from './BaseWebviewProvider';
import { TransactionHistoryStateProvider } from '../state/TransactionHistoryStateProvider';
import { WakeStateProvider } from '../state/WakeStateProvider';

import * as vscode from 'vscode';
import { WakeApi } from '../api/wake';

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

export abstract class SakeProvider {
    state: SakeState;
    network: INetworkProvider; // TODO consider making this not private

    constructor(
        public id: string,
        public displayName: string,
        networkProvider: INetworkProvider,
        webviewProvider: BaseWebviewProvider
    ) {
        this.state = new SakeState(webviewProvider);
        this.network = networkProvider;
    }

    /* Account management */

    async addAccount(address: string) {
        throw new Error('Method not implemented.');

        // // check if account is already in the list
        // if (this.state.accounts.includes(address)) {
        //     return;
        // }

        // // get data from network
        // const account: Account | undefined = await this.network.registerAccount(address);

        // if (account) {
        //     this.state.accounts.add(account);
        // }
    }

    async removeAccount(address: string) {
        throw new Error('Method not implemented.');

        // this.state.accounts.remove(address);
    }

    async setAccountBalance(address: string, balance: number) {
        const success = await this.network.setAccountBalance(address, balance);

        if (success) {
            this.state.accounts.setBalance(address, balance);
        }
    }

    async setAccountNickname(address: string, nickname: string) {
        this.state.accounts.setNickname(address, nickname);
    }

    async refreshAccount(address: string) {
        const account: Account | undefined = await this.network.getAccountDetails(address);

        if (account) {
            this.state.accounts.add(account);
        }
    }

    /* Deployment management */

    async deployContract(deploymentRequest: DeploymentRequest) {
        const success = await this.network.deployContract(deploymentRequest);

        // TODO
        if (success) {
            this.state.deployedContracts.add(deploymentRequest);
        }

        // TODO add to history
    }

    async removeDeployedContract(contract: string) {
        this.state.deployedContracts.remove(contract);
    }

    /* Interactions */

    async call(callRequest: CallRequest) {
        const success = await this.network.call(callRequest);

        if (success) {
            // TODO add to history
            // this.state.history.add(callRequest);
        }
    }

    /* Helper functions */

    async fetchContractFromEtherscan(address: string) {
        throw new Error('Method not implemented.');
        // TODO
    }

    /* Event handling */

    async onActivateProvider() {
        // TODO save state
        this.state.subscribe();
    }

    async onDeactivateProvider() {
        // TODO save state
        this.state.unsubscribe();
    }
}

export class LocalNodeSakeProvider extends SakeProvider {
    private _wake: WakeApi;
    constructor(
        id: string,
        displayName: string,
        networkProvider: INetworkProvider,
        webviewProvider: BaseWebviewProvider
        // private wakeApi: WakeApi
    ) {
        super(id, displayName, networkProvider, webviewProvider);

        this._wake = WakeApi.getInstance();
        this.initialize();
    }

    async initialize() {
        const accounts = await this._wake.getAccounts();
        for (const account of accounts) {
            const accountDetails = await this.network.getAccountDetails(account);
            if (accountDetails) {
                this.state.accounts.add(accountDetails);
            }
        }
    }
}

// export class PublicNodeSakeProvider extends SakeProvider {}

export class SakeProviderManager {
    private _selectedProviderId!: string;
    private _providers!: Map<string, SakeProvider>;
    private _statusBarItem!: vscode.StatusBarItem;

    constructor(private context: vscode.ExtensionContext, ...providers: SakeProvider[]) {
        if (providers.length === 0) {
            throw new Error('No providers provided');
        }

        this._initializeStatusBar();

        for (const provider of providers) {
            this.addProvider(provider);
        }

        this.setProvider(providers[0].id);
    }

    addProvider(provider: SakeProvider) {
        if (this._providers.has(provider.id)) {
            throw new Error('Provider with id ' + provider.id + ' already exists');
        }

        this._providers.set(provider.id, provider);
    }

    removeProvider(id: string) {
        if (!this._providers.has(id)) {
            throw new Error('Provider with id ' + id + ' does not exist');
        }

        if (id === this._selectedProviderId) {
            throw new Error('Cannot remove the current provider');
        }

        if (this._providers.size === 1) {
            throw new Error('Cannot have less than 1 provider');
        }

        this._providers.delete(id);
    }

    get provider(): SakeProvider {
        return this._providers.get(this._selectedProviderId)!;
    }

    get state(): SakeState {
        return this.provider.state;
    }

    // get network(): INetworkProvider {
    //     return this.provider.network;
    // }

    setProvider(id: string) {
        if (!this._providers.has(id)) {
            throw new Error('Provider with id ' + id + ' does not exist');
        }

        if (this._selectedProviderId === id) {
            return;
        }

        this.provider.onDeactivateProvider();

        this._selectedProviderId = id;
        this.provider.onActivateProvider();

        this._updateStatusBar();

        // notify webviews of the switch
        // TODO
    }

    private _updateStatusBar() {
        this._statusBarItem.text = `$(cloud) ${this.provider.displayName}`;
        this._statusBarItem.show();
    }

    private _selectProvider() {
        const providerOptions = Array.from(this._providers.keys()).map((id) => ({ label: id }));
        vscode.window.showQuickPick(providerOptions).then((selected) => {
            if (selected) {
                this.setProvider(selected.label);
            }
        });
    }

    private _initializeStatusBar() {
        this._statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 1);
        this.context.subscriptions.push(this._statusBarItem);
        this.context.subscriptions.push(
            vscode.commands.registerCommand(
                'Tools-for-Solidity.sake.selectSakeProvider',
                this._selectProvider.bind(this)
            )
        );
        this._statusBarItem.command = 'Tools-for-Solidity.sake.selectSakeProvider';
    }
}
