import { LanguageClient } from 'vscode-languageclient/node';
import {
    Account,
    CallRequest,
    CallResponse,
    DeploymentRequest,
    DeploymentResponse,
    SetAccountBalanceResponse,
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
import * as Wake from '../api/wake';
import { WakeApi } from '../api/wake';
import { SakeProvider } from '../providers/SakeProviders';

export class NetworkError extends Error {}

export abstract class NetworkProvider {
    // constructor(private _sake: SakeProvider) {}

    // protected get sakeState() {
    //     return this._sake.state;
    // }

    // maybe just allowing to get shared state should work...

    abstract registerAccount(address: string): Promise<Account | undefined>;
    abstract getAccountDetails(address: string): Promise<Account | undefined>;
    abstract setAccountBalance(
        address: string,
        balance: number
    ): Promise<SetAccountBalanceResponse>;
    abstract deploy(params: DeploymentRequest): Promise<DeploymentResponse>;
    abstract call(params: CallRequest): Promise<CallResponse>;
}

export class LocalNodeNetworkProvider extends NetworkProvider implements NetworkProvider {
    // id: string = 'local-node';
    private _wake: WakeApi;

    constructor() {
        super();
        this._wake = WakeApi.getInstance();
    }

    async registerAccount(address: string): Promise<Account | undefined> {
        throw new Error('Method not implemented.');
        // TODO
    }

    async getAccountDetails(address: string): Promise<Account | undefined> {
        const result = await this._wake.getBalances({
            addresses: [address]
        });

        return {
            address,
            balance: result.balances[address]
        };
    }

    async setAccountBalance(address: string, balance: number): Promise<SetAccountBalanceResponse> {
        const response: WakeSetBalancesResponse = await this._wake.setBalances({
            balances: {
                [address]: balance
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
        const response: WakeCallResponse = await this._wake.call({
            contractAddress: params.to,
            sender: params.from,
            calldata: params.calldata,
            value: params.value
        } as WakeCallRequestParams);

        return response as CallResponse;
    }

    async transact(params: TransactRequest): Promise<TransactResponse> {
        const response: WakeTransactResponse = await this._wake.transact({
            contractAddress: params.to,
            sender: params.from,
            calldata: params.calldata,
            value: params.value
        } as WakeTransactRequestParams);

        return response as TransactResponse;
    }
}

export const SupportedNetworks = [
    {
        id: 'local',
        name: 'Local Node',
        provider: LocalNodeNetworkProvider
    }
];
