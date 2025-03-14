import {
    Address,
    ContractAbi,
    DeployedContract,
    DeploymentResponse,
    NetworkInfo,
    NetworkType
} from '../webview/shared/types';

import {
    CallRequest,
    CallResponse,
    DeploymentRequest,
    NetworkConfiguration,
    SetAccountBalanceRequest,
    SetAccountBalanceResponse,
    TransactRequest,
    TransactResponse
} from '../webview/shared/network_types';
import { NetworkState } from '../webview/shared/storage_types';
import { Account } from '../webview/shared/types';

export abstract class NetworkProvider {
    type: NetworkType;

    constructor(
        type: NetworkType,
        public providerId: string
    ) {
        this.type = type;
    }

    abstract registerAccount(address: string): Promise<Account | undefined>;
    abstract getAccountDetails(address: string): Promise<Account>;
    abstract setAccountBalance(
        request: SetAccountBalanceRequest
    ): Promise<SetAccountBalanceResponse>;
    abstract deploy(params: DeploymentRequest): Promise<DeploymentResponse>;
    abstract call(params: CallRequest): Promise<CallResponse>;
    abstract transact(params: TransactRequest): Promise<TransactResponse>;
    abstract onActivate(): Promise<void>;
    abstract onDeactivate(): Promise<void>;
    abstract onDeleteChain(): Promise<void>;
    /* Helper Functions */
    abstract dumpState(): Promise<NetworkState>;
    abstract loadState(state: any): Promise<void>; // TODO: add specific type
    abstract getAbi(address: Address): Promise<{ abi: ContractAbi; name: string }>;
    abstract getOnchainContract(address: Address): Promise<DeployedContract>;
    abstract getInfo(): NetworkInfo;
    abstract config: NetworkConfiguration;
}
