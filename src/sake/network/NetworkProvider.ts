import { Address, ContractAbi, DeploymentResponse } from '../webview/shared/types';

import {
    CallRequest,
    CallResponse,
    DeploymentRequest,
    NetworkId,
    SetAccountBalanceRequest,
    SetAccountBalanceResponse
} from '../webview/shared/network_types';
import { Account } from '../webview/shared/types';
import { NetworkState } from '../webview/shared/storage_types';
import { NetworkManager } from './NetworkManager';
import ChainStateProvider from '../state/ChainStateProvider';

export abstract class NetworkProvider {
    type: NetworkId;
    _connected: boolean = false;

    constructor(
        type: NetworkId,
        protected providerId: string
    ) {
        this.type = type;
        NetworkManager.getInstance().addProvider(this);
    }

    deleteChain(): Promise<void> {
        NetworkManager.getInstance().deleteProvider(this);
        return this.onDeleteChain();
    }

    get connected(): boolean {
        return this._connected;
    }

    set connected(value: boolean) {
        this._connected = value;
        ChainStateProvider.getInstance().setChainConnectionStatus(this.providerId, value);
    }

    abstract registerAccount(address: string): Promise<Account | undefined>;
    abstract getAccountDetails(address: string): Promise<Account>;
    abstract setAccountBalance(
        request: SetAccountBalanceRequest
    ): Promise<SetAccountBalanceResponse>;
    abstract deploy(params: DeploymentRequest): Promise<DeploymentResponse>;
    abstract call(params: CallRequest): Promise<CallResponse>;
    abstract onActivate(): Promise<void>;
    abstract onDeactivate(): Promise<void>;
    abstract onDeleteChain(): Promise<void>;
    /* Helper Functions */
    abstract dumpState(): Promise<NetworkState>;
    abstract loadState(state: any): Promise<void>; // TODO: add specific type
    abstract getAbi(address: Address): Promise<{ abi: ContractAbi; name: string }>;
}
