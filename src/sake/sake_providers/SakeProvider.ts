import {
    AbiFunctionFragment,
    Account,
    Address,
    CallOperation,
    CallRequest,
    CallType,
    AppState,
    DeploymentRequest,
    DeploymentResponse,
    GetBytecodeRequest,
    GetBytecodeResponse,
    SetAccountBalanceRequest,
    SetAccountLabelRequest,
    TransactionCallResult,
    TransactionDecodedReturnValue,
    TransactionDeploymentResult,
    ContractAbi,
    DeployedContractType,
    DeployedContract,
    NetworkConfiguration
} from '../webview/shared/types';
import * as vscode from 'vscode';
import * as WakeApi from '../api/wake';
import { OutputViewManager } from '../providers/OutputTreeProvider';
import {
    getNameFromContractFqn,
    parseCompilationIssues,
    parseCompilationSkipped,
    parseCompiledContracts
} from '../utils/compilation';
import { decodeCallReturnValue } from '../utils/call';
import { showTimedInfoMessage } from '../commands';
import { SakeProviderQuickPickItem } from '../webview/shared/helper_types';
import {
    NetworkState,
    SakeProviderInitializationRequest,
    SharedState
} from '../webview/shared/storage_types';
import SakeState from './SakeState';
import { SakeError } from '../webview/shared/errors';
import { NetworkProvider } from '../network/NetworkProvider';

// TODO consider renaming to BaseSakeProvider
export abstract class BaseSakeProvider<T extends NetworkProvider> {
    state: SakeState;
    protected output: OutputViewManager;

    constructor(
        public id: string,
        public displayName: string,
        public network: T,
        protected initializationRequest: SakeProviderInitializationRequest
    ) {
        this.state = new SakeState();
        this.output = OutputViewManager.getInstance();
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

    abstract connect(): Promise<void>;

    set connected(value: boolean) {
        this.network.connected = value;
    }

    get connected(): boolean {
        return this.network.connected;
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
        this.state.compilation.set(parsedContracts, [...parsedErrors, ...parsedSkipped]);

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
            this.state.accounts.setBalance(request.address, request.balance);
        }
    }

    async setAccountLabel(request: SetAccountLabelRequest) {
        this.state.accounts.setLabel(request.address, request.label);
        this.state.deployment.setLabel(request.address, request.label);
    }

    async refreshAccount(address: string) {
        const account: Account | undefined = await this.network.getAccountDetails(address);

        if (!account) {
            return;
        }

        if (this.state.accounts.includes(address)) {
            this.state.accounts.update({
                ...account,
                label: this.state.accounts.get(address)?.label
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
                type: DeployedContractType.Compiled,
                name: compilation.name,
                address: deploymentResponse.deployedAddress,
                abi: compilation.abi,
                fqn: deploymentRequest.contractFqn,
                balance: balance
            });

            // TODO
            showTimedInfoMessage(
                `Deployed contract ${compilation.name} at address ${deploymentResponse.deployedAddress}`
            );
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

    /* ABI fetching */

    async getAbi(address: Address): Promise<{ abi: ContractAbi; name: string }> {
        const abiResponse = await this.network.getAbi(address);
        return abiResponse;
    }

    async getOnchainContract(address: Address): Promise<DeployedContract> {
        const abiResponse = await this.network.getOnchainContract(address);
        return abiResponse;
    }

    /* Event handling */

    async onActivateProvider() {
        // TODO save state
        this.state.subscribe();
        this.network.onActivate();
    }

    async onDeactivateProvider() {
        // TODO save state
        this.state.unsubscribe();
        this.network.onDeactivate();
    }

    /* State Handling */

    async dumpState() {
        return {
            id: this.id,
            displayName: this.displayName,
            state: this.state.dumpProviderState(),
            network: await this.network.dumpState()
        };
    }

    // async loadState(providerState: ProviderState) {
    //     // TODO
    //     throw new Error('Method not implemented.');
    // }

    /* Helper functions */

    abstract _getQuickPickItem(): SakeProviderQuickPickItem;

    abstract _getStatusBarItemText(): string;

    abstract onDeleteProvider(): Promise<void>;
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
