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
    WakeSetBalancesResponse
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
}

export class LocalNodeNetworkProvider extends NetworkProvider implements NetworkProvider {
    public id: string = 'local-node';
    private _wake: WakeApi;

    constructor() {
        super();
        this._wake = WakeApi.getInstance();
    }

    async registerAccount(address: string): Promise<Account | undefined> {
        throw new NetworkError('Method not implemented.');
        // TODO
    }

    async getAccountDetails(address: string): Promise<Account> {
        const result = await this._wake.getBalances({
            addresses: [address]
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
            }
        } as WakeSetBalancesRequestParams);

        return response;
    }

    async deploy(params: DeploymentRequest): Promise<DeploymentResponse> {
        const response: WakeDeploymentResponse = await this._wake.deploy(
            params as WakeDeploymentRequestParams
        );

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
            value: params.value
        };

        const response: WakeCallResponse =
            params.callType == CallType.Call
                ? await this._wake.call(request)
                : await this._wake.transact(request);

        return {
            success: response.success,
            receipt: response.txReceipt,
            callTrace: response.callTrace,
            returnValue: response.returnValue
        };
    }
}

export const SupportedNetworks = [
    {
        defaultName: 'Local Node',
        provider: LocalNodeNetworkProvider
    }
];
