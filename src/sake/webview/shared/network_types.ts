import type { AbiFunctionFragment, Address, HexString, TransactionReceipt } from 'web3-types';
import type { WakeCallRequestParams, WakeCallTrace } from './wake_types';

export type WalletDeploymentData = {
    contractFqn: string;
    sender: Address;
    calldata: HexString;
    value: number;
};

interface Transaction {
    success: boolean;
    receipt?: TransactionReceipt;
    callTrace?: WakeCallTrace;
}

/* Account Management */

export interface SetAccountBalanceResponse {
    success: boolean;
}

/* Deployment */

export interface DeploymentRequest {
    contractFqn: string; // TODO maybe this should be smth like contractId
    sender: Address;
    calldata: HexString;
    value: number;
}

export interface DeploymentResponse extends Transaction {
    deployedAddress: Address;
}

/* Call */

export interface CallRequest {
    to: Address;
    from: Address;
    calldata: HexString;
    value: number;
}

export interface CallResponse {
    returnValue: HexString;
}

/* Transact */

export interface TransactRequest extends CallRequest {}

export interface TransactResponse extends CallResponse {}

// }
