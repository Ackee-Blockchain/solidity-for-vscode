import { Account, Address, CallRequest, DeploymentRequest } from '../webview/shared/types';

import { NetworkProvider, LocalNodeNetworkProvider } from '../network/networks';
import { AccountStateProvider } from '../state/AccountStateProvider';
import { DeploymentStateProvider } from '../state/DeploymentStateProvider';
import { CompilationStateProvider } from '../state/CompilationStateProvider';
import { BaseWebviewProvider } from './BaseWebviewProvider';
import { TransactionHistoryStateProvider } from '../state/TransactionHistoryStateProvider';
import { WakeStateProvider } from '../state/WakeStateProvider';

import * as vscode from 'vscode';
import { WakeApi } from '../api/wake';
import { OutputViewManager } from './OutputTreeProvider';

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

export class SakeError extends Error {}

export class SakeProvider {
    state: SakeState;
    network: NetworkProvider;
    protected output: OutputViewManager;

    constructor(
        public id: string,
        public displayName: string,
        networkProvider: NetworkProvider,
        webviewProvider: BaseWebviewProvider
    ) {
        this.state = new SakeState(webviewProvider);
        this.network = networkProvider;
        this.output = OutputViewManager.getInstance();

        this.setAccountBalance = showVSCodeMessageOnErrorWrapper(this.setAccountBalance.bind(this));
        this.setAccountNickname = showVSCodeMessageOnErrorWrapper(
            this.setAccountNickname.bind(this)
        );
        this.refreshAccount = showVSCodeMessageOnErrorWrapper(this.refreshAccount.bind(this));
        this.deployContract = showVSCodeMessageOnErrorWrapper(this.deployContract.bind(this));
        this.removeDeployedContract = showVSCodeMessageOnErrorWrapper(
            this.removeDeployedContract.bind(this)
        );
        this.callContract = showVSCodeMessageOnErrorWrapper(this.callContract.bind(this));
        // this.transactContract = showVSCodeMessageOnErrorWrapper(this.transactContract.bind(this));
    }

    /* Account management */

    // async addAccount(address: string) {
    //     // check if account is already in the list
    //     if (this.state.accounts.includes(address)) {
    //         return;
    //     }

    //     // get data from network
    //     const account: Account | undefined = await this.network.registerAccount(address);

    //     if (account) {
    //         this.state.accounts.add(account);
    //     }
    // }

    // async removeAccount(address: string) {
    //     this.state.accounts.remove(address);
    // }

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

        if (!account) {
            return;
        }

        if (this.state.accounts.includes(address)) {
            this.state.accounts.update({
                ...account,
                nick: this.state.accounts.get(address)?.nick
            });
        } else {
            this.state.accounts.add(account);
        }
    }

    /* Deployment management */

    async deployContract(deploymentRequest: DeploymentRequest) {
        const deploymentResponse = await this.network.deploy(deploymentRequest);

        if (deploymentResponse.success) {
            const compilation = this.state.compiledContracts.get(deploymentRequest.contractFqn);

            if (!compilation) {
                throw new SakeError('Deployment failed: Contract ABI was not found');
            }

            const balance = (
                await this.network.getAccountDetails(deploymentResponse.deployedAddress)
            )?.balance;

            this.state.deployedContracts.add({
                name: compilation.name,
                address: deploymentResponse.deployedAddress,
                abi: compilation.abi,
                balance: balance
            });
        }

        // TODO add to history

        // TODO add to history
    }

    async removeDeployedContract(address: Address) {
        this.state.deployedContracts.remove(address);
    }

    /* Interactions */

    async callContract(callRequest: CallRequest) {
        // const { requestParams, func } = callRequest;
        // const callType = specifyCallType(func);
        // const apiEndpoint =
        //     callType === CallType.Transact ? 'wake/sake/transact' : 'wake/sake/call';

        const callResponse = await this.network.call(callRequest);

        if (callResponse.success) {
            this.output.set(callResponse);
            // TODO add to history
            // this.state.history.add(callRequest);
        }
    }

    // async transactContract(transactRequest: TransactRequest) {
    //     const transactResponse = await this.network.transact(transactRequest);
    // }

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
        networkProvider: NetworkProvider,
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

    // get network(): NetworkProvider {
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

// TODO add context if needed
function showVSCodeMessageOnErrorWrapper<T, Args extends any[]>(
    func: (...args: Args) => Promise<T>
): (...args: Args) => Promise<T | undefined> {
    return async (...args: Args) => {
        try {
            return await func(...args);
        } catch (e) {
            vscode.window.showErrorMessage(`${e instanceof Error ? e.message : String(e)}`);
            return undefined;
        }
    };
}
