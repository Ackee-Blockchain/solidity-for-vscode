import { LanguageClient } from 'vscode-languageclient/node';
import {
    Account,
    CallRequest,
    DeploymentRequest,
    TransactRequest,
    WakeSetBalancesRequestParams,
    WakeSetBalancesResponse
} from '../webview/shared/types';
import * as Wake from '../wakeApi';
import { WakeApi } from '../wakeApi';

export class NetworkError extends Error {}

export interface INetworkProvider {
    // id: string;
    registerAccount(address: string): Promise<Account | undefined>;
    getAccountDetails(address: string): Promise<Account | undefined>;
    setAccountBalance(address: string, balance: number): Promise<void>;
    deployContract(params: DeploymentRequest): Promise<DeploymentResponse>;
    call(params: CallRequest): Promise<CallResponse>;
}

// export class PublicNodeNetworkProvider {}

export class LocalNodeNetworkProvider implements INetworkProvider {
    // id: string = 'local-node';
    private _wake: WakeApi;

    constructor() {
        this._wake = WakeApi.getInstance();
    }

    async registerAccount(address: string): Promise<Account | undefined> {
        throw new Error('Method not implemented.');
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

    async setAccountBalance(address: string, balance: number): Promise<void> {
        const response: WakeSetBalancesResponse = await this._wake.setBalances({
            balances: {
                [address]: balance
            }
        } as WakeSetBalancesRequestParams);

        if (!response.success) {
            throw new NetworkError('Failed to set account balance');
        }
    }

    async deployContract(params: DeploymentRequest): Promise<DeploymentResponse> {
        throw new Error('Method not implemented.');
    }

    async call(params: CallRequest): Promise<CallResponse> {
        throw new Error('Method not implemented.');
    }
}

export const SupportedNetworks = [
    {
        id: 'local',
        name: 'Local Node',
        provider: LocalNodeNetworkProvider
    }
];
