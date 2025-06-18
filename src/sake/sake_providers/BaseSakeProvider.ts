import * as vscode from 'vscode';
import * as WakeApi from '../api/wake';
import { showErrorMessage, showInfoMessage, showTimedInfoMessage } from '../commands';
import { NetworkProvider } from '../network/NetworkProvider';
import { OutputViewManager } from '../providers/OutputTreeProvider';
import { chainRegistry } from '../state/shared/ChainRegistry';
import { autosaver } from '../storage/autosave';
import { deleteChainState, loadChainState, saveChainState } from '../storage/stateHandler';
import { createChainStateFileWatcher, existsProviderState } from '../storage/stateUtils';
import { decodeCallReturnValue } from '../utils/call';
import {
    getNameFromContractFqn,
    parseCompilationIssues,
    parseCompilationSkipped,
    parseCompiledContracts
} from '../utils/compilation';
import { GenericHook } from '../utils/hook';
import { SakeError } from '../webview/shared/errors';
import { SakeProviderQuickPickItem } from '../webview/shared/helper_types';
import {
    ProviderState as StoredProviderState,
    SakeProviderInitializationRequest,
    SakeProviderInitializationRequestType,
    SakeProviderType
} from '../webview/shared/storage_types';
import {
    Account,
    Address,
    CallOperation,
    CallRequest,
    CallType,
    ChainPersistence,
    ContractAbi,
    DeployedContract,
    DeployedContractType,
    DeploymentRequest,
    GetBytecodeRequest,
    GetBytecodeResponse,
    ImplementationContract,
    SetAccountBalanceRequest,
    SetAccountLabelRequest,
    TransactionCallResult,
    TransactionDecodedReturnValue,
    TransactionDeploymentResult,
    TransactRequest,
    WakeCompilationResponse
} from '../webview/shared/types';
import sakeProviderManager from './SakeProviderManager';
import SakeState from './SakeState';
import { DeploymentResponse } from '../webview/shared/network_types';

export interface ISakeProvider {
    id: string;
    type: SakeProviderType;
    displayName: Readonly<string>;
    network: NetworkProvider;
    connected: boolean;
    initializationRequest: SakeProviderInitializationRequest;
    chainState: SakeState;
    providerState: Readonly<ProviderState>;
    disconnect(): void;
    connect(): Promise<void>;
    reset(): Promise<void>;
    rename(name: string): Promise<void>;
    getBytecode(request: GetBytecodeRequest): Promise<GetBytecodeResponse | undefined>;
    compile(): Promise<WakeCompilationResponse>;
    setAccountBalance(request: SetAccountBalanceRequest): Promise<void>;
    setAccountLabel(request: SetAccountLabelRequest): Promise<void>;
    refreshAccount(address: string): Promise<void>;
    deployContract(deploymentRequest: DeploymentRequest): Promise<boolean>;
    removeDeployedContract(address: Address): Promise<void>;
    callContract(callRequest: CallRequest): Promise<boolean>;
    transactContract(transactRequest: TransactRequest): Promise<boolean>;
    getAbi(address: Address): Promise<{ abi: ContractAbi; name: string }>;
    getOnchainContract(address: Address): Promise<DeployedContract>;
    fetchContract(address: Address): Promise<void>;
    removeProxy(address: Address, proxyId: string): Promise<void>;
    extendProxySupport(address: Address, proxy: Omit<ImplementationContract, 'id'>): Promise<void>;
    onActivateProvider(): Promise<void>;
    onDeactivateProvider(): Promise<void>;
    onDeleteProvider(): Promise<void>;
    dumpState(): Promise<StoredProviderState>;
    getQuickPickItem(): SakeProviderQuickPickItem;
    saveState(): Promise<void>;
    deleteStateSave(): Promise<void>;
    setAutosave(autosave: boolean): void;
    subscribe(callback: () => void): () => void;
}

export interface ProviderState {
    type: SakeProviderType;
    id: string;
    name: string;
    network: NetworkProvider;
    connected: boolean;
    persistence: ChainPersistence;
}

export abstract class BaseSakeProvider<TNetworkProvider extends NetworkProvider>
    implements ISakeProvider
{
    private _providerStateHook: GenericHook<ProviderState>;
    private _didFirstConnect: boolean = false;
    private _fileWatcherSetup: boolean = false;

    // also contains providerState: ProviderState via hook
    public chainState: SakeState;

    constructor(
        type: SakeProviderType,
        id: string,
        displayName: string, // @todo rename to name
        network: TNetworkProvider,
        public initializationRequest: SakeProviderInitializationRequest,
        persistence: {
            isDirty: boolean;
            isAutosaveEnabled: boolean;
            lastSaveTimestamp: number | undefined;
        }
    ) {
        if (chainRegistry.contains(id)) {
            throw new Error('Provider with id ' + id + ' already exists');
        }

        this._providerStateHook = new GenericHook<ProviderState>({
            type: type,
            id: id,
            connected: false,
            name: displayName,
            network: network,
            persistence
        });

        // @dev base sake provider has to be fully initialized before being added to chainRegistry
        // due to chainregistry listeners
        this.chainState = new SakeState();
        chainRegistry.add(this.id, this);

        // wrap all methods which require autosaving in a wrapper that saves the state with a delay
        // load vscode settings - autosave.enabled
        this.deployContract = this.persistenceWrapper<boolean, [DeploymentRequest]>(
            this.deployContract.bind(this)
        );
        this.callContract = this.persistenceWrapper<boolean, [CallRequest]>(
            this.callContract.bind(this)
        );
        this.transactContract = this.persistenceWrapper<boolean, [TransactRequest]>(
            this.transactContract.bind(this)
        );
        this.setAccountBalance = this.persistenceWrapper(this.setAccountBalance.bind(this));
        this.setAccountLabel = this.persistenceWrapper(this.setAccountLabel.bind(this));
        this.rename = this.persistenceWrapper(this.rename.bind(this));
        this.removeDeployedContract = this.persistenceWrapper(
            this.removeDeployedContract.bind(this)
        );
        this.removeProxy = this.persistenceWrapper(this.removeProxy.bind(this));
        this.extendProxySupport = this.persistenceWrapper(this.extendProxySupport.bind(this));
        this.fetchContract = this.persistenceWrapper(this.fetchContract.bind(this));

        // wrap all methods that might throw errors in a wrapper that shows a message in vscode
        this.setAccountBalance = showVSCodeMessageOnErrorWrapper(
            this.setAccountBalance.bind(this),
            undefined
        );
        this.setAccountLabel = showVSCodeMessageOnErrorWrapper(
            this.setAccountLabel.bind(this),
            undefined
        );
        this.refreshAccount = showVSCodeMessageOnErrorWrapper(
            this.refreshAccount.bind(this),
            undefined
        );
        this.deployContract = showVSCodeMessageOnErrorWrapper(
            this.deployContract.bind(this),
            false
        );
        this.removeDeployedContract = showVSCodeMessageOnErrorWrapper(
            this.removeDeployedContract.bind(this),
            undefined
        );
        this.callContract = showVSCodeMessageOnErrorWrapper(this.callContract.bind(this), false);
        // this.transactContract = showVSCodeMessageOnErrorWrapper(this.transactContract.bind(this));

        // check if state file exists
        // Only set up file watcher if we're loading from an existing state
        if (initializationRequest.type === SakeProviderInitializationRequestType.LoadFromState) {
            createChainStateFileWatcher(this, () => {
                this.persistence = {
                    isDirty: true,
                    lastSaveTimestamp: undefined
                };
            });
        }
    }

    get type(): Readonly<SakeProviderType> {
        return this.providerState.type;
    }

    // @dev providerState variables got via this are readonly, to set any value on providerstate use the setter
    get providerState(): Readonly<ProviderState> {
        return this._providerStateHook.get();
    }

    set providerState(subState: Partial<ProviderState>) {
        this._providerStateHook.setLazy(subState);
    }

    get connected(): Readonly<boolean> {
        return this.providerState.connected;
    }

    set connected(connected: boolean) {
        this.providerState = {
            connected
        };
    }

    get persistence(): Readonly<ChainPersistence> {
        return this.providerState.persistence;
    }

    set persistence(persistence: Partial<ChainPersistence>) {
        this.providerState = {
            ...this.providerState,
            persistence: {
                ...this.providerState.persistence,
                ...persistence
            }
        };
    }

    get id(): string {
        return this.providerState.id;
    }

    get displayName(): Readonly<string> {
        return this.providerState.name;
    }

    get network(): TNetworkProvider {
        return this.providerState.network as TNetworkProvider;
    }

    disconnect() {
        this.providerState = {
            connected: false
        };
    }

    /* Compilation */

    async compile() {
        const compilationResponse = await WakeApi.compile();

        if (!compilationResponse.success) {
            throw new SakeError('Compilation was unsuccessful');
        }

        const parsedContracts = parseCompiledContracts(compilationResponse.contracts);
        const parsedErrors = parseCompilationIssues(compilationResponse.errors);
        const parsedSkipped = parseCompilationSkipped(compilationResponse.skipped);
        this.chainState.compilation.setBoth(parsedContracts, [...parsedErrors, ...parsedSkipped]);

        return compilationResponse;
    }

    async getBytecode(request: GetBytecodeRequest): Promise<GetBytecodeResponse | undefined> {
        const bytecodeResponse = await WakeApi.getBytecode(request);
        return bytecodeResponse;
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

    async setAccountBalance(request: SetAccountBalanceRequest) {
        const success = await this.network.setAccountBalance(request);

        if (success) {
            this.chainState.accounts.setBalance(request.address, request.balance);
        }
    }

    async setAccountLabel(request: SetAccountLabelRequest) {
        this.chainState.accounts.setLabel(request.address, request.label);
        this.chainState.deployment.setLabel(request.address, request.label);
    }

    async refreshAccount(address: string) {
        const account: Account | undefined = await this.network.getAccountDetails(address);

        if (!account) {
            return;
        }

        if (this.chainState.accounts.includes(address)) {
            this.chainState.accounts.update({
                ...account,
                label: this.chainState.accounts.getAccount(address)?.label
            });
        } else {
            this.chainState.accounts.add(account);
        }
    }

    /* Deployment management */

    async deployContract(deploymentRequest: DeploymentRequest): Promise<boolean> {
        const compiledContract = this.chainState.compilation.getContract(
            deploymentRequest.contractFqn
        );

        if (!compiledContract) {
            throw new SakeError('Deployment failed: Contract ABI was not found');
        }

        const deploymentResponse: DeploymentResponse = await this.network.deploy(deploymentRequest);

        if (deploymentResponse.success) {
            const balance = (
                await this.network.getAccountDetails(deploymentResponse.deployedAddress)
            ).balance;

            this.chainState.deployment.add({
                type: DeployedContractType.Compiled,
                name: compiledContract.name,
                address: deploymentResponse.deployedAddress,
                abi: compiledContract.abi,
                fqn: deploymentRequest.contractFqn,
                balance: balance
            });

            showTimedInfoMessage(
                `Deployed contract ${compiledContract.name} at address ${deploymentResponse.deployedAddress}`
            );
        }

        // TODO consider check and update balance of caller

        const transaction: TransactionDeploymentResult = {
            type: CallOperation.Deployment,
            success: deploymentResponse.success,
            error: deploymentResponse.error,
            from: deploymentRequest.sender,
            contractAddress: deploymentResponse.deployedAddress,
            contractName: getNameFromContractFqn(deploymentRequest.contractFqn),
            receipt: deploymentResponse.receipt,
            callTrace: deploymentResponse.callTrace,
            events: deploymentResponse.events
        };

        OutputViewManager.getInstance().set(transaction);
        this.chainState.history.add(transaction);

        return deploymentResponse.success;
    }

    async removeDeployedContract(address: Address) {
        this.chainState.deployment.remove(address);
    }

    /* Interactions */

    async callContract(callRequest: CallRequest): Promise<boolean> {
        const callResponse = await this.network.call(callRequest);

        let decoded: TransactionDecodedReturnValue[] | undefined;

        if (callResponse.success) {
            try {
                decoded = decodeCallReturnValue(callResponse.returnValue, callRequest.functionAbi);
            } catch (e) {
                showErrorMessage('Failed to decode return value: ' + e, true);
            }
        }

        const transaction: TransactionCallResult = {
            type: CallOperation.FunctionCall,
            success: callResponse.success,
            from: callRequest.from,
            to: callRequest.to,
            functionName: callRequest.functionAbi.name,
            returnData: {
                bytes: callResponse.returnValue,
                decoded: decoded
            },
            callType: CallType.Call,
            callTrace: callResponse.callTrace
        };

        OutputViewManager.getInstance().set(transaction);
        this.chainState.history.add(transaction);

        return callResponse.success;

        // TODO consider check and update balance of caller and callee
    }

    async transactContract(transactRequest: TransactRequest): Promise<boolean> {
        const callResponse = await this.network.transact(transactRequest);

        let decoded: TransactionDecodedReturnValue[] | undefined;

        if (callResponse.success) {
            try {
                decoded = decodeCallReturnValue(
                    callResponse.returnValue,
                    transactRequest.functionAbi
                );
            } catch (e) {
                showErrorMessage('Failed to decode return value: ' + e, true);
            }
        }

        const transaction: TransactionCallResult = {
            type: CallOperation.FunctionCall,
            success: callResponse.success,
            from: transactRequest.from,
            to: transactRequest.to,
            functionName: transactRequest.functionAbi.name,
            events: callResponse.events,
            returnData: {
                bytes: callResponse.returnValue,
                decoded: decoded
            },
            callType: CallType.Transact,
            receipt: callResponse.receipt,
            callTrace: callResponse.callTrace,
            error: callResponse.error
        };

        OutputViewManager.getInstance().set(transaction);
        this.chainState.history.add(transaction);

        return callResponse.success;

        // TODO consider check and update balance of caller and callee
    }

    /* ABI fetching */

    async getAbi(address: Address): Promise<{ abi: ContractAbi; name: string }> {
        const abiResponse = await this.network.getAbi(address);
        return abiResponse;
    }

    async getOnchainContract(address: Address): Promise<DeployedContract> {
        const abiResponse = await this.network.getOnchainContract(address);
        return abiResponse;
    }

    async fetchContract(address: Address) {
        try {
            const deployedContract = await this.getOnchainContract(address);
            this.chainState.deployment.add(deployedContract);
        } catch (e) {
            vscode.window
                .showErrorMessage(
                    `Unable to fetch ABI for ${address}. Do you wish to add it as a contract with an empty ABI?`,
                    'Add with empty ABI'
                )
                .then((selected) => {
                    if (selected === 'Add with empty ABI') {
                        this.chainState.deployment.add({
                            type: DeployedContractType.OnChain,
                            address: address,
                            abi: [],
                            name: 'Unknown',
                            balance: undefined
                        });
                    }
                });
        }
    }

    /* Proxy management */

    async removeProxy(address: Address, proxyId: string) {
        this.chainState.deployment.removeProxy(address, proxyId);
    }

    async extendProxySupport(address: Address, proxy: Omit<ImplementationContract, 'id'>) {
        this.chainState.deployment.extendProxySupport(address, proxy);
    }

    /* Event handling */

    async onActivateProvider() {
        this.network.onActivate();
    }

    async onDeactivateProvider() {
        this.network.onDeactivate();
    }

    async onDeleteProvider(): Promise<void> {
        chainRegistry.delete(this.id);
        if (this.connected) {
            await this.network.onDeleteChain();
        }
        if (await existsProviderState(this)) {
            await this.deleteStateSave();
        }
    }

    /* State Handling */

    async saveState() {
        const tempLastSaveTimestamp = this.persistence.lastSaveTimestamp;
        const tempIsDirty = this.persistence.isDirty;
        this.persistence = {
            isDirty: false,
            lastSaveTimestamp: Date.now()
        };
        const success = await saveChainState(this);
        if (!success) {
            this.persistence = {
                isDirty: tempIsDirty,
                lastSaveTimestamp: tempLastSaveTimestamp
            };
        } else if (!this._fileWatcherSetup) {
            // Set up file watcher after first successful save
            this._fileWatcherSetup = true;
            createChainStateFileWatcher(this, () => {
                this.persistence = {
                    isDirty: true,
                    lastSaveTimestamp: undefined
                };
            });
        }
    }

    async getSavedState(): Promise<StoredProviderState | undefined> {
        return loadChainState(this);
    }

    async deleteStateSave() {
        const success = await deleteChainState(this);
        if (success) {
            this.persistence = {
                isDirty: false,
                lastSaveTimestamp: undefined
            };
        }
    }

    setAutosave(autosave: boolean) {
        if (this.persistence.isAutosaveEnabled === autosave) {
            return;
        }

        this.persistence = {
            ...this.persistence,
            isAutosaveEnabled: autosave
        };

        if (!autosave) {
            // remove any leftover timeout when autosave is disabled
            autosaver.removeTimeout(this);
        } else if (this.persistence.isDirty || this.persistence.lastSaveTimestamp === undefined) {
            // automatically save state when autosave is enabled
            this.saveState();
        }
    }

    getQuickPickItem(): SakeProviderQuickPickItem {
        const buttons = [
            {
                iconPath: new vscode.ThemeIcon('trash'),
                tooltip: 'Delete'
            }
        ];
        // if (!this.connected) {
        //     buttons.push({
        //         iconPath: new vscode.ThemeIcon('refresh'),
        //         tooltip: 'Reconnect'
        //     });
        // }
        return {
            providerId: this.id,
            label: this.displayName,
            detail: this.connected ? 'Connected' : 'Disconnected',
            description: this.network.type,
            iconPath: this.connected
                ? new vscode.ThemeIcon('vm-active')
                : new vscode.ThemeIcon('vm-outline'),
            buttons,
            itemButtonClick: (button: vscode.QuickInputButton) => {
                if (button.tooltip === 'Delete') {
                    sakeProviderManager.removeProvider(this);
                }
            }
        };
    }

    // async loadState(providerState: ProviderState) {
    //     // TODO
    //     throw new Error('Method not implemented.');
    // }

    async reset() {
        await this.onDeleteProvider();
    }

    async connect() {
        if (this._didFirstConnect) {
            await this._reconnect();
        } else {
            await this._connect();
            if (this.connected) {
                this._didFirstConnect = true;
            }
        }
    }

    /* To be implemented by subclasses */

    abstract dumpState(): Promise<StoredProviderState>;

    protected abstract _connect(): Promise<void>;

    protected abstract _reconnect(): Promise<void>;

    /* Subscribable */

    subscribe(callback: () => void): () => void {
        return this._providerStateHook.subscribe(callback);
    }

    /* Helpers */

    persistenceWrapper<T, Args extends any[]>(
        func: (...args: Args) => Promise<T>
    ): (...args: Args) => Promise<T> {
        return async (...args: Args) => {
            this.persistence = {
                isDirty: true
            };
            if (this.persistence.isAutosaveEnabled) {
                autosaver.onStateChange(this);
            }
            return await func(...args);
        };
    }

    sendNotificationToWebview(data: { notificationHeader: string; notificationBody: string }) {
        showInfoMessage(data.notificationBody);
        // sendSignalToWebview(SignalId.showNotification, data);
    }

    async rename(name: string) {
        this.providerState = {
            ...this.providerState,
            name
        };
    }
}

// TODO add context if needed
function showVSCodeMessageOnErrorWrapper<T, Args extends any[]>(
    func: (...args: Args) => Promise<T>,
    returnOnError: T
): (...args: Args) => Promise<T> {
    return async (...args: Args) => {
        try {
            return await func(...args);
        } catch (e) {
            showErrorMessage(e, true);
            return returnOnError;
        }
    };
}
