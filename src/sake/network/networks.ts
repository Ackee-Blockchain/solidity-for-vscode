import { LanguageClient } from 'vscode-languageclient/node';
import {
    Account,
    CallRequest,
    CallResponse,
    CallType,
    DeploymentRequest,
    DeploymentResponse,
    SetAccountBalanceResponse,
    SetAccountBalanceRequest,
    TransactRequest,
    TransactResponse,
    WakeCallRequestParams,
    WakeCallResponse,
    WakeDeploymentRequestParams,
    WakeDeploymentResponse,
    WakeSetBalancesRequestParams,
    WakeSetBalancesResponse,
    WakeTransactRequestParams,
    WakeTransactResponse
} from '../webview/shared/types';
import { WakeApi } from '../api/wake';

export class NetworkError extends Error {}

export abstract class NetworkProvider {
    // constructor(private _sake: SakeProvider) {}

    // protected get sakeState() {
    //     return this._sake.state;
    // }

    // maybe just allowing to get shared state should work...
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
        throw new Error('Method not implemented.');
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

        return response as SetAccountBalanceResponse;
    }

    async deploy(params: DeploymentRequest): Promise<DeploymentResponse> {
        const response: WakeDeploymentResponse = await this._wake.deploy(
            params as WakeDeploymentRequestParams
        );

        return response as DeploymentResponse;
    }

    async call(params: CallRequest): Promise<CallResponse> {
        if (params.callType == CallType.Call) {
            return await this._wake.call({
                contractAddress: params.to,
                sender: params.from,
                calldata: params.calldata,
                value: params.value
            } as WakeCallRequestParams);
        }
        return await this._wake.transact({
            contractAddress: params.to,
            sender: params.from,
            calldata: params.calldata,
            value: params.value
        } as WakeTransactRequestParams);
    }
}

export const SupportedNetworks = [
    {
        id: 'local',
        name: 'Local Node',
        provider: LocalNodeNetworkProvider
    }
];
