import {
    Account,
    CallRequest,
    CallResponse,
    CallType,
    DeploymentRequest,
    DeploymentResponse,
    SetAccountBalanceResponse,
    SetAccountBalanceRequest,
    WakeCallRequestParams,
    WakeCallResponse,
    WakeDeploymentRequestParams,
    WakeDeploymentResponse,
    WakeSetBalancesRequestParams,
    WakeSetBalancesResponse,
    NetworkConfiguration,
    WakeTransactResponse,
    NetworkCreationConfiguration,
    WakeCreateChainRequestParams,
    WakeCreateChainResponse,
    CreateLocalChainRequest
} from '../webview/shared/types';
import { WakeApi } from '../api/wake';

export class NetworkError extends Error {}

export abstract class NetworkProvider {
    public abstract id: string;
    abstract registerAccount(address: string): Promise<Account | undefined>;
    abstract getAccountDetails(address: string): Promise<Account>;
    abstract setAccountBalance(
        request: SetAccountBalanceRequest
    ): Promise<SetAccountBalanceResponse>;
    abstract deploy(params: DeploymentRequest): Promise<DeploymentResponse>;
    abstract call(params: CallRequest): Promise<CallResponse>;
    abstract onActivate(): Promise<void>;
    abstract onDeactivate(): Promise<void>;
}

export class LocalNodeNetworkProvider extends NetworkProvider implements NetworkProvider {
    public id: string = 'local-node';
    private _wake: WakeApi;

    private constructor(public config: NetworkConfiguration) {
        super();
        this._wake = WakeApi.getInstance();
    }

    static async createNewChain(request: CreateLocalChainRequest): Promise<{
        network: LocalNodeNetworkProvider;
        initializationResult: WakeCreateChainResponse;
    }> {
        const result = await WakeApi.getInstance().createChain({
            sessionId: request.sessionId,
            accounts: request.accounts ?? null,
            chainId: request.chainId ?? null,
            fork: request.fork ?? null,
            hardfork: request.hardfork ?? null,
            minGasPrice: request.minGasPrice ?? null,
            blockBaseFeePerGas: request.blockBaseFeePerGas ?? null
        });

        if (!result.success) {
            throw new NetworkError('Failed to create new chain');
        }

        const config: NetworkConfiguration = {
            sessionId: request.sessionId,
            chainId: request.chainId,
            fork: request.fork,
            hardfork: request.hardfork,
            minGasPrice: request.minGasPrice,
            blockBaseFeePerGas: request.blockBaseFeePerGas,
            type: result.type,
            uri: result.uri
        };

        return {
            network: new LocalNodeNetworkProvider(config),
            initializationResult: result
        };
    }

    async onActivate() {}

    async onDeactivate() {}

    async registerAccount(address: string): Promise<Account | undefined> {
        throw new NetworkError('Method not implemented.');
        // TODO
    }

    async getAccountDetails(address: string): Promise<Account> {
        const result = await this._wake.getBalances({
            addresses: [address],
            sessionId: this.config.sessionId
        });

        return {
            address,
            balance: result.balances[address]
        };
    }

    async setAccountBalance(request: SetAccountBalanceRequest): Promise<SetAccountBalanceResponse> {
        const response: WakeSetBalancesResponse = await this._wake.setBalances({
            balances: {
                [request.address]: request.balance
            },
            sessionId: this.config.sessionId
        });

        return response;
    }

    async deploy(params: DeploymentRequest): Promise<DeploymentResponse> {
        const response: WakeDeploymentResponse = await this._wake.deploy({
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
                response = await this._wake.call(request);

                return {
                    success: response.success,
                    callTrace: response.callTrace,
                    returnValue: response.returnValue
                };
            case CallType.Transact:
                response = await this._wake.transact(request);
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
}

export const SupportedNetworks = [
    {
        defaultName: 'Local Node',
        provider: LocalNodeNetworkProvider
    }
];
