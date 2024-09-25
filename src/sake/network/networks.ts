import { LanguageClient } from 'vscode-languageclient/node';
import {
    Account,
    CallRequest,
    DeploymentRequest,
    TransactRequest,
    WakeSetBalancesRequestParams
} from '../webview/shared/types';
import * as Wake from '../wakeApi';

interface NetworkState {
    accounts: string[];
    deployedContracts: string[];
}

export interface INetworkProvider {
    // id: string;
    registerAccount(address: string): Account | undefined;
    getAccountDetails(address: string): Account | undefined;
    setAccountBalance(address: string, balance: number): boolean;
    deployContract(params: DeploymentRequest): boolean;
    call(params: CallRequest): boolean;
    transact(params: TransactRequest): boolean;
}

export class PublicNodeNetworkProvider {}

export class LocalNodeNetworkProvider implements INetworkProvider {
    // id: string = 'local-node';

    constructor(private readonly client: LanguageClient) {}

    registerAccount(address: string): Account | undefined {
        throw new Error('Method not implemented.');
    }
    getAccountDetails(address: string): Account | undefined {
        throw new Error('Method not implemented.');
    }
    setAccountBalance(address: string, balance: number): boolean {
        Wake.setBalances(
            {
                balances: {
                    [address]: balance
                }
            } as WakeSetBalancesRequestParams,
            this.client
        );
    }
    deployContract(params: DeploymentRequest): boolean {
        throw new Error('Method not implemented.');
    }
    call(params: CallRequest): boolean {
        throw new Error('Method not implemented.');
    }
    transact(params: TransactRequest): boolean {
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
