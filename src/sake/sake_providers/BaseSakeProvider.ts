import * as vscode from 'vscode';
import * as WakeApi from '../api/wake';
import { showTimedInfoMessage } from '../commands';
import { NetworkProvider } from '../network/NetworkProvider';
import { OutputViewManager } from '../providers/OutputTreeProvider';
import { ChainHook, chainRegistry } from '../state/ChainRegistry';
import { decodeCallReturnValue } from '../utils/call';
import {
    getNameFromContractFqn,
    parseCompilationIssues,
    parseCompilationSkipped,
    parseCompiledContracts
} from '../utils/compilation';
import { fingerprint } from '../utils/hash';
import { SakeError } from '../webview/shared/errors';
import { SakeProviderQuickPickItem } from '../webview/shared/helper_types';
import {
    SakeProviderInitializationRequest
} from '../webview/shared/storage_types';
import {
    AbiFunctionFragment,
    Account,
    Address,
    CallOperation,
    CallRequest,
    CallType,
    ContractAbi,
    DeployedContract,
    DeployedContractType,
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
import { LocalNodeSakeProvider } from './LocalNodeSakeProvider';
import { providerRegistry } from './ProviderRegistry';
import SakeState from './SakeState';

export abstract class BaseSakeProvider<T extends NetworkProvider> {
    private _hook: ChainHook;

    constructor(
        public id: string,
        public displayName: string,
        public network: T,
        public initializationRequest: SakeProviderInitializationRequest
    ) {
        // check if chain already exists
        if (chainRegistry.contains(this.id)) {
            throw new Error('Provider with id ' + this.id + ' already exists');
        }

        this._hook = chainRegistry.add(this.id, displayName, network.getInfo());
        providerRegistry.add(this.id, this as any as LocalNodeSakeProvider); // @todo currently a hotfix to ignore type error
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

    get connected(): boolean {
        return this._hook.get().connected;
    }

    set connected(connected: boolean) {
        this._hook.setLazy({
            connected: connected
        });
    }

    get states(): SakeState {
        return this._hook.get().states;
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
        this.states.compilation.set(parsedContracts, [...parsedErrors, ...parsedSkipped]);

        return compilationResponse;
    }

    async getBytecode(request: GetBytecodeRequest): Promise<GetBytecodeResponse | undefined> {
        const bytecodeResponse = await WakeApi.getBytecode(request);
        return bytecodeResponse;
    }

    /* Account management */

    // async addAccount(address: string) {
    //     // check if account is already in the list
    //     if (this.states.accounts.includes(address)) {
    //         return;
    //     }

    //     // get data from network
    //     const account: Account | undefined = await this.network.registerAccount(address);

    //     if (account) {
    //         this.states.accounts.add(account);
    //     }
    // }

    // async removeAccount(address: string) {
    //     this.states.accounts.remove(address);
    // }

    async setAccountBalance(request: SetAccountBalanceRequest) {
        const success = await this.network.setAccountBalance(request);

        if (success) {
            this.states.accounts.setBalance(request.address, request.balance);
        }
    }

    async setAccountLabel(request: SetAccountLabelRequest) {
        this.states.accounts.setLabel(request.address, request.label);
        this.states.deployment.setLabel(request.address, request.label);
    }

    async refreshAccount(address: string) {
        const account: Account | undefined = await this.network.getAccountDetails(address);

        if (!account) {
            return;
        }

        if (this.states.accounts.includes(address)) {
            this.states.accounts.update({
                ...account,
                label: this.states.accounts.get(address)?.label
            });
        } else {
            this.states.accounts.add(account);
        }
    }

    /* Deployment management */

    async deployContract(deploymentRequest: DeploymentRequest) {
        const compilation = this.states.compilation.get(deploymentRequest.contractFqn);

        if (!compilation) {
            throw new SakeError('Deployment failed: Contract ABI was not found');
        }

        const deploymentResponse: DeploymentResponse = await this.network.deploy(deploymentRequest);

        if (deploymentResponse.success) {
            const balance = (
                await this.network.getAccountDetails(deploymentResponse.deployedAddress)
            ).balance;

            this.states.deployment.add({
                type: DeployedContractType.Compiled,
                name: compilation.name,
                address: deploymentResponse.deployedAddress,
                abi: compilation.abi,
                fqn: deploymentRequest.contractFqn,
                balance: balance
            });

            showTimedInfoMessage(
                `Deployed contract ${compilation.name} at address ${deploymentResponse.deployedAddress}`
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
        this.states.history.add(transaction);
    }

    async removeDeployedContract(address: Address) {
        this.states.deployment.remove(address);
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
            events: callResponse.events,
            returnData: {
                bytes: callResponse.returnValue,
                decoded: decoded
            },
            receipt: callResponse.receipt,
            callTrace: callResponse.callTrace,
            error: callResponse.error
        };

        OutputViewManager.getInstance().set(transaction);
        this.states.history.add(transaction);

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
            this.states.deployment.add(deployedContract);
        } catch (e) {
            vscode.window
                .showErrorMessage(
                    `Unable to fetch ABI for ${address}. Do you wish to add it as a contract with an empty ABI?`,
                    'Add with empty ABI'
                )
                .then((selected) => {
                    if (selected === 'Add with empty ABI') {
                        this.states.deployment.add({
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

    removeProxy(address: Address, proxyId: string) {
        this.states.deployment.removeProxy(address, proxyId);
    }

    /* Event handling */

    async onActivateProvider() {
        this.states.subscribe();
        this.network.onActivate();
    }

    async onDeactivateProvider() {
        this.states.unsubscribe();
        this.network.onDeactivate();
    }

    async onDeleteProvider(): Promise<void> {
        chainRegistry.delete(this.id);
        providerRegistry.delete(this.id);
    }

    /* State Handling */

    async dumpState() {
        const providerState = this.states.dumpProviderState();
        return {
            id: this.id,
            displayName: this.displayName,
            state: providerState,
            network: await this.network.dumpState(),
            stateFingerprint: fingerprint(providerState)
        };
    }

    // async loadState(providerState: ProviderState) {
    //     // TODO
    //     throw new Error('Method not implemented.');
    // }

    /* Helper functions */

    abstract _getQuickPickItem(): SakeProviderQuickPickItem;

    abstract _getStatusBarItemText(): string;
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
