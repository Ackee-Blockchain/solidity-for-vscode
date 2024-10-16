import { WakeApi } from '../api/wake';
import { ChainStateProvider } from '../state/ChainStateProvider';
import { NetworkError } from '../webview/shared/error_types';
import {
    CallRequest,
    CallResponse,
    CallType,
    CreateLocalChainRequest,
    DeploymentRequest,
    DeploymentResponse,
    NetworkConfiguration,
    NetworkId,
    NetworkProvider,
    SetAccountBalanceRequest,
    SetAccountBalanceResponse,
    SetAccountLabelRequest
} from '../webview/shared/network_types';
import { LocalNodeNetworkState, WakeChainDump } from '../webview/shared/storage_types';
import { Account, ChainStatus } from '../webview/shared/types';
import {
    WakeCallRequestParams,
    WakeDeploymentResponse,
    WakeDumpStateResponse,
    WakeGetAccountsResponse,
    WakeSetBalancesResponse
} from '../webview/shared/wake_types';

export class LocalNodeNetworkProvider implements NetworkProvider {
    public type = NetworkId.LocalNode;
    private _connected: boolean = false;

    private constructor(public config: NetworkConfiguration) {}

    static async createNewChainProvider(request: CreateLocalChainRequest): Promise<{
        network: LocalNodeNetworkProvider;
        initialized: boolean;
    }> {
        const config: NetworkConfiguration = {
            sessionId: request.sessionId,
            chainId: request.chainId,
            fork: request.fork,
            hardfork: request.hardfork,
            minGasPrice: request.minGasPrice,
            blockBaseFeePerGas: request.blockBaseFeePerGas,
            type: undefined,
            uri: undefined
        };

        const network = new LocalNodeNetworkProvider(config);

        const initialized = await network
            .initialize(request.accounts)
            .then(() => {
                return true;
            })
            .catch((e) => {
                console.error('Failed to initialize chain', e);
                return false;
            });

        return {
            network,
            initialized
        };
    }

    static async createFromState(state: LocalNodeNetworkState): Promise<LocalNodeNetworkProvider> {
        const { network } = await this.createNewChainProvider(state.config);

        return network;
    }

    async initialize(accounts?: number): Promise<void> {
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

        this.connected = true;
        this.config.type = response.type;
        this.config.uri = response.uri;
    }

    async deleteChain() {
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
            deployedAddress: response.contractAddress
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

        let response;
        switch (params.callType) {
            case CallType.Call:
                response = await WakeApi.call(request);

                return {
                    success: response.success,
                    callTrace: response.callTrace,
                    returnValue: response.returnValue
                };
            case CallType.Transact:
                response = await WakeApi.transact(request);
                return {
                    success: response.success,
                    receipt: response.txReceipt,
                    callTrace: response.callTrace,
                    returnValue: response.returnValue
                };
            default:
                throw new NetworkError('Invalid call type');
        }

        // TODO include errors from response
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

    set connected(connected: boolean) {
        this._connected = connected;
        // if (!connected) {
        //     ChainStateProvider.getInstance().setLocalNodesDisconnectedStatus();
        // }
    }

    get connected(): boolean {
        return this._connected;
    }

    async dumpState(): Promise<LocalNodeNetworkState> {
        const response: WakeDumpStateResponse = await WakeApi.dumpState({
            sessionId: this.config.sessionId
        });

        if (!response.success) {
            throw new NetworkError('Failed to dump state');
        }

        return {
            wakeDump: {
                metadata: response.metadata,
                chainDump: response.chainDump
            },
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

        this.connected = true;
    }
}
