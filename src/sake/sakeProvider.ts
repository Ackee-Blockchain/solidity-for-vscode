import { AccountState, Contract } from './webview/shared/types';

import { INetworkProvider } from './network/networks';

export class SakeState {
    _accounts: AccountState = {};
    _deployedContracts: string[] = [];
    _contracts: Map<string, Contract> = new Map();
}

export class SakeProvider {
    _state: SakeState;
    constructor(private _networkProvider: INetworkProvider) {
        this._state = new SakeState();
    }

    get accounts(): Promise<string[]> {
        return this._networkProvider.getAccounts();
    }

    async getDeployedContracts(): Promise<string[]> {
        return this._networkProvider.getDeployedContracts();
    }

    async getContract(address: string): Promise<Contract> {
        return this._networkProvider.getContract(address);
    }

    get _network(): INetworkProvider {
        return this._networkProvider;
    }
}
