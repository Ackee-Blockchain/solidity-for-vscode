import type { AbiFunctionFragment, Address, HexString, TransactionReceipt } from 'web3-types';
import type {
    WakeCallRequestParams,
    WakeCallTrace,
    WakeGetBytecodeResponse,
    WakeGetBytecodeRequestParams
} from './wake_types';

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

export enum CallType {
    Call = 'Call',
    Transact = 'Transact'
}

export enum CallOperation {
    Deployment = 'Deployment',
    FunctionCall = 'Function Call'
}

/* Compilation */

export type GetBytecodeRequest = WakeGetBytecodeRequestParams;
export type GetBytecodeResponse = WakeGetBytecodeResponse;

/* Account Management */

export interface SetAccountBalanceRequest {
    address: Address;
    balance: number;
}

export interface SetAccountBalanceResponse {
    success: boolean;
}

export interface SetAccountNicknameRequest {
    address: Address;
    nickname: string;
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
    callType?: CallType;
    functionAbi: AbiFunctionFragment;
}

export interface CallResponse extends Transaction {
    returnValue: HexString;
}

/* Transact */

export interface TransactRequest extends CallRequest {}

export interface TransactResponse extends CallResponse {}

// }
