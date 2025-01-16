import { v4 as uuidv4 } from 'uuid';
import * as WakeApi from '../api/wake';
import { NetworkError } from '../webview/shared/errors';
import {
    CallRequest,
    CallResponse,
    CallType,
    DeploymentRequest,
    DeploymentResponse,
    NetworkConfiguration,
    SetAccountBalanceRequest,
    SetAccountBalanceResponse,
    SetAccountLabelRequest,
    TransactRequest,
    TransactResponse
} from '../webview/shared/network_types';
import { BaseWakeNetworkState, WakeChainDump } from '../webview/shared/storage_types';
import {
    Account,
    Address,
    ContractAbi,
    DeployedContract,
    DeployedContractType,
    NetworkInfo,
    NetworkType
} from '../webview/shared/types';
import {
    WakeCallRequestParams,
    WakeDeploymentResponse,
    WakeDumpStateResponse,
    WakeGetAbiResponse,
    WakeGetAbiWithProxyResponse,
    WakeGetAccountsResponse,
    WakeSetBalancesResponse
} from '../webview/shared/wake_types';
import { NetworkProvider } from './NetworkProvider';

export class LocalNodeNetworkProvider extends NetworkProvider {
    constructor(public config: NetworkConfiguration) {
        super(NetworkType.Local, config.sessionId);
    }

    /*
     * Initialization via Wake API
     * Creates a new chain from network configuration
     */
    async createChain(accounts?: number): Promise<void> {
        const response = await WakeApi.createChain({
            sessionId: this.config.sessionId,
            accounts: accounts ?? null,
            chainId: this.config.chainId ?? null,
            fork: this.config.fork ?? null,
            hardfork: this.config.hardfork ?? null,
            minGasPrice: this.config.minGasPrice ?? null,
            blockBaseFeePerGas: this.config.blockBaseFeePerGas ?? null
        });

        if (!response.success) {
            throw new NetworkError('Failed to create new chain');
        }

        this.config.type = response.type;
        this.config.uri = response.uri;
    }

    /*
     * Initialization via Wake API
     * Connects to an existing (already running) chain via URI
     */
    async connectChain() {
        if (!this.config.uri) {
            throw new NetworkError('Cannot connect to chain without URI');
        }

        const response = await WakeApi.connectChain({
            sessionId: this.config.sessionId,
            uri: this.config.uri
        });

        if (!response.success) {
            throw new NetworkError('Failed to connect to chain');
        }
    }

    async onDeleteChain() {
        const response = await WakeApi.disconnectChain({
            sessionId: this.config.sessionId
        });

        if (!response.success) {
            throw new NetworkError('Failed to delete chain');
        }
    }

    async onActivate() {}

    async onDeactivate() {}

    async registerAccount(address: string): Promise<Account | undefined> {
        throw new NetworkError('Method not implemented.');
        // TODO
    }

    async getAccountDetails(address: string): Promise<Account> {
        const response = await WakeApi.getBalances({
            addresses: [address],
            sessionId: this.config.sessionId
        });

        return {
            address,
            balance: response.balances[address]
        };
    }

    async setAccountBalance(request: SetAccountBalanceRequest): Promise<SetAccountBalanceResponse> {
        const response: WakeSetBalancesResponse = await WakeApi.setBalances({
            balances: {
                [request.address]: request.balance
            },
            sessionId: this.config.sessionId
        });

        return response;
    }

    async deploy(params: DeploymentRequest): Promise<DeploymentResponse> {
        const response: WakeDeploymentResponse = await WakeApi.deploy({
            ...params,
            sessionId: this.config.sessionId
        });

        // TODO include errors from response

        return {
            success: response.success,
            receipt: response.txReceipt,
            callTrace: response.callTrace,
            deployedAddress: response.contractAddress,
            error: response.error,
            events: response.events
        };
    }

    async call(params: CallRequest): Promise<CallResponse> {
        const request: WakeCallRequestParams = {
            contractAddress: params.to,
            sender: params.from,
            calldata: params.calldata,
            value: params.value,
            sessionId: this.config.sessionId
        };

        const response = await WakeApi.call(request);

        return {
            success: response.success,
            callTrace: response.callTrace,
            returnValue: response.returnValue
        };

        // TODO include errors from response
    }

    async transact(params: TransactRequest): Promise<TransactResponse> {
        const request: WakeCallRequestParams = {
            contractAddress: params.to,
            sender: params.from,
            calldata: params.calldata,
            value: params.value,
            sessionId: this.config.sessionId
        };

        const response = await WakeApi.transact(request);
        return {
            success: response.success,
            receipt: response.txReceipt,
            callTrace: response.callTrace,
            returnValue: response.returnValue,
            events: response.events,
            error: response.error
        };
    }

    /* Additional Methods */

    async setAccountLabel(request: SetAccountLabelRequest) {
        const response = await WakeApi.setLabel({
            address: request.address,
            label: request.label ?? null,
            sessionId: this.config.sessionId
        });

        return response;
    }

    async getAccounts(): Promise<string[]> {
        const response: WakeGetAccountsResponse = await WakeApi.getAccounts({
            sessionId: this.config.sessionId
        });

        return response;
    }

    async dumpState(includeWakeDump: boolean = true): Promise<any> {
        let wakeDump;
        if (includeWakeDump) {
            const response: WakeDumpStateResponse = await WakeApi.dumpState({
                sessionId: this.config.sessionId
            });

            if (!response.success) {
                throw new NetworkError('Failed to dump state');
            }
            wakeDump = {
                metadata: response.metadata,
                chainDump: response.chainDump
            };
        }

        return {
            wakeDump,
            type: this.type,
            config: this.config
        };
    }

    async loadState(wakeDump: WakeChainDump) {
        const response = await WakeApi.loadState({
            metadata: wakeDump.metadata,
            chainDump: wakeDump.chainDump,
            sessionId: this.config.sessionId
        });

        if (!response.success) {
            throw new NetworkError('Failed to load state');
        }
    }

    async getAbi(address: Address): Promise<{ abi: ContractAbi; name: string }> {
        // @dev simpler to use getAbiWithProxy for now, as chainId for getAbi can be undefined
        const response: WakeGetAbiResponse = await WakeApi.getAbiWithProxy({
            address: address,
            sessionId: this.config.sessionId
        });

        return {
            abi: response.abi,
            name: response.name
        };
    }

    async getOnchainContract(address: Address): Promise<DeployedContract> {
        const response: WakeGetAbiWithProxyResponse = await WakeApi.getAbiWithProxy({
            address: address,
            sessionId: this.config.sessionId
        });

        return {
            type: DeployedContractType.OnChain,
            name: response.name,
            address: address,
            abi: response.proxyAbi ?? [],
            proxyFor: response.abi
                ? [
                      {
                          id: uuidv4(),
                          address: response.implementationAddress ?? undefined,
                          abi: response.abi,
                          name: response.proxyName ?? undefined
                      }
                  ]
                : undefined
        };
    }

    getInfo(): NetworkInfo {
        return {
            type: NetworkType.Local,
            config: this.config
        };
    }
}
