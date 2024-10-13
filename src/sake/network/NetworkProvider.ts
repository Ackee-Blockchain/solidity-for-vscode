import {
    Account,
    CallRequest,
    CallResponse,
    DeploymentRequest,
    DeploymentResponse,
    SetAccountBalanceResponse,
    SetAccountBalanceRequest
} from '../webview/shared/types';

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
