import { Account } from '../webview/shared/types';

interface NetworkState {
    accounts: string[];
    deployedContracts: string[];
}

export abstract class INetworkProvider {
    abstract id: string;
    abstract addAccount(address: string): Account | undefined;
    abstract setAccountBalance(address: string, balance: number): boolean;
    abstract deploy(contract: string): boolean;
}

export class NetworkProvider {}

export class LocalNodeNetworkProvider {}

export const SupportedNetworks = [
    {
        id: 'local',
        name: 'Local Node',
        provider: LocalNodeNetworkProvider
    }
];
