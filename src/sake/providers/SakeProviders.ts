import {
    AbiFunctionFragment,
    Account,
    Address,
    CallOperation,
    CallRequest,
    CallType,
    ChainState,
    DeploymentRequest,
    DeploymentResponse,
    GetBytecodeRequest,
    GetBytecodeResponse,
    SetAccountBalanceRequest,
    SetAccountLabelRequest,
    TransactionCallResult,
    TransactionDecodedReturnValue,
    TransactionDeploymentResult
} from '../webview/shared/types';
import { LocalNodeNetworkProvider, NetworkProvider } from '../network/networks';
import { AccountStateProvider } from '../state/AccountStateProvider';
import { DeploymentStateProvider } from '../state/DeploymentStateProvider';
import { CompilationStateProvider } from '../state/CompilationStateProvider';
import { BaseWebviewProvider } from './BaseWebviewProvider';
import { TransactionHistoryStateProvider } from '../state/TransactionHistoryStateProvider';
import { SharedChainStateProvider } from '../state/SharedChainStateProvider';
import * as vscode from 'vscode';
import { WakeApi } from '../api/wake';
import { OutputViewManager } from './OutputTreeProvider';
import {
    getNameFromContractFqn,
    parseCompilationIssues,
    parseCompilationSkipped,
    parseCompiledContracts
} from '../utils/compilation';
import { decodeCallReturnValue } from '../utils/call';
import { v4 as uuidv4 } from 'uuid';
import { getTextFromInputBox, showTimedInfoMessage } from '../commands';

export class SakeState {
    accounts: AccountStateProvider;
    deployment: DeploymentStateProvider;
    compilation: CompilationStateProvider;
    history: TransactionHistoryStateProvider;
    chains: SharedChainStateProvider;
    subscribed: boolean;

    constructor(private _webviewProvider: BaseWebviewProvider) {
        // network-specific state
        this.accounts = new AccountStateProvider();
        this.deployment = new DeploymentStateProvider();
        this.history = new TransactionHistoryStateProvider();

        // shared state
        this.compilation = CompilationStateProvider.getInstance();
        this.chains = SharedChainStateProvider.getInstance();

        this.subscribed = false;
    }

    subscribe() {
        this.accounts.subscribe(this._webviewProvider);
        this.deployment.subscribe(this._webviewProvider);
        this.history.subscribe(this._webviewProvider);
        this.chains.subscribe(this._webviewProvider);
        this.compilation.subscribe(this._webviewProvider);

        this.subscribed = true;
    }

    unsubscribe() {
        this.accounts.unsubscribe(this._webviewProvider);
        this.deployment.unsubscribe(this._webviewProvider);
        this.history.unsubscribe(this._webviewProvider);
        this.chains.unsubscribe(this._webviewProvider);
        this.compilation.unsubscribe(this._webviewProvider);

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
}

export class SakeError extends Error {}

export class SakeProvider {
    state: SakeState;
    network: NetworkProvider;
    protected output: OutputViewManager;
    protected wake: WakeApi;

    constructor(
        public id: string,
        public displayName: string,
        networkProvider: NetworkProvider,
        webviewProvider: BaseWebviewProvider
    ) {
        this.state = new SakeState(webviewProvider);
        this.network = networkProvider;
        this.output = OutputViewManager.getInstance();
        this.wake = WakeApi.getInstance();
        this.setAccountBalance = showVSCodeMessageOnErrorWrapper(this.setAccountBalance.bind(this));
        this.setAccountLabel = showVSCodeMessageOnErrorWrapper(this.setAccountLabel.bind(this));
        this.refreshAccount = showVSCodeMessageOnErrorWrapper(this.refreshAccount.bind(this));
        this.deployContract = showVSCodeMessageOnErrorWrapper(this.deployContract.bind(this));
        this.removeDeployedContract = showVSCodeMessageOnErrorWrapper(
            this.removeDeployedContract.bind(this)
        );
        this.callContract = showVSCodeMessageOnErrorWrapper(this.callContract.bind(this));
        // this.transactContract = showVSCodeMessageOnErrorWrapper(this.transactContract.bind(this));
    }

    /* Compilation */

    async compile() {
        const compilationResponse = await this.wake.compile();

        if (!compilationResponse.success) {
            throw new SakeError('Compilation was unsuccessful');
        }

        const parsedContracts = parseCompiledContracts(compilationResponse.contracts);
        const parsedErrors = parseCompilationIssues(compilationResponse.errors);
        const parsedSkipped = parseCompilationSkipped(compilationResponse.skipped);
        this.state.compilation.set(parsedContracts, [...parsedErrors, ...parsedSkipped]);

        return compilationResponse;
    }

    async getBytecode(request: GetBytecodeRequest): Promise<GetBytecodeResponse | undefined> {
        const bytecodeResponse = await this.wake.getBytecode(request);
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
            this.state.accounts.setBalance(request.address, request.balance);
        }
    }

    async setAccountLabel(request: SetAccountLabelRequest) {
        this.state.accounts.setNickname(request.address, request.nickname);
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
        const compilation = this.state.compilation.get(deploymentRequest.contractFqn);

        if (!compilation) {
            throw new SakeError('Deployment failed: Contract ABI was not found');
        }

        const deploymentResponse: DeploymentResponse = await this.network.deploy(deploymentRequest);

        if (deploymentResponse.success) {
            const balance = (
                await this.network.getAccountDetails(deploymentResponse.deployedAddress)
            ).balance;

            this.state.deployment.add({
                name: compilation.name,
                address: deploymentResponse.deployedAddress,
                abi: compilation.abi,
                balance: balance
            });

            // TODO
            showTimedInfoMessage(`Deployed contract ${compilation.name} at address`);
        }

        // TODO consider check and update balance of caller

        const transaction: TransactionDeploymentResult = {
            type: CallOperation.Deployment,
            success: deploymentResponse.success,
            from: deploymentRequest.sender,
            contractAddress: deploymentResponse.deployedAddress,
            contractName: getNameFromContractFqn(deploymentRequest.contractFqn),
            receipt: deploymentResponse.receipt,
            callTrace: deploymentResponse.callTrace
        };

        this.output.set(transaction);
        this.state.history.add(transaction);
    }

    async removeDeployedContract(address: Address) {
        this.state.deployment.remove(address);
    }

    /* Interactions */

    async callContract(callRequest: CallRequest) {
        if (callRequest.callType === undefined) {
            callRequest.callType = specifyCallType(callRequest.functionAbi);
        }

        const callResponse = await this.network.call(callRequest);

        let decoded: TransactionDecodedReturnValue[] | undefined;

        if (callResponse.success) {
            try {
                decoded = decodeCallReturnValue(callResponse.returnValue, callRequest.functionAbi);
            } catch (e) {
                vscode.window.showErrorMessage('Failed to decode return value: ' + e);
            }
        }

        const transaction: TransactionCallResult = {
            type: CallOperation.FunctionCall,
            success: callResponse.success,
            from: callRequest.from,
            to: callRequest.to,
            functionName: callRequest.functionAbi.name,
            callType: callRequest.callType,
            returnData: {
                bytes: callResponse.returnValue,
                decoded: decoded
            },
            receipt: callResponse.receipt,
            callTrace: callResponse.callTrace
        };

        this.output.set(transaction);
        this.state.history.add(transaction);

        // TODO consider check and update balance of caller and callee
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
        networkProvider: NetworkProvider,
        webviewProvider: BaseWebviewProvider
        // private wakeApi: WakeApi
    ) {
        super(id, displayName, networkProvider, webviewProvider);

        this._wake = WakeApi.getInstance();

        const subscribed = this.state.subscribed;
        if (subscribed) {
            this.state.unsubscribe();
        }
        this.initialize();
        if (subscribed) {
            this.state.subscribe();
        }
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

function specifyCallType(func: AbiFunctionFragment): CallType {
    return func.stateMutability === 'view' || func.stateMutability === 'pure'
        ? CallType.Call
        : CallType.Transact;
}
