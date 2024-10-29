import type { AbiFunctionFragment, Address, HexString, TransactionReceipt } from 'web3-types';
import type {
    WakeCallRequestParams,
    WakeCallTrace,
    WakeGetBytecodeResponse,
    WakeGetBytecodeRequestParams,
    WakeCreateChainRequestParams
} from './wake_types';
import type { Account } from './types';
import type { NetworkState, WakeChainDump } from './storage_types';

interface Transaction {
    success: boolean;
    receipt?: TransactionReceipt;
    callTrace: WakeCallTrace | null; // @hotfix: this is currently undefined in the response
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

export interface SetAccountLabelRequest {
    address: Address;
    label?: string;
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

/* Network Configuration */

// TODO these are all specific to LocalNodeNetworkProvider, although naming suggests general use

export interface NetworkConfiguration {
    sessionId: string;
    type?: string;
    uri?: string;
    chainId?: number;
    fork?: string;
    hardfork?: string;
    minGasPrice?: number;
    blockBaseFeePerGas?: number;
}
export interface CreateLocalChainRequest {
    sessionId: string;
    accounts?: number;
    chainId?: number;
    fork?: string;
    hardfork?: string;
    minGasPrice?: number;
    blockBaseFeePerGas?: number;
}

export enum NetworkId {
    LocalNode = 'Anvil'
}

export interface NetworkCreationConfiguration extends Omit<CreateLocalChainRequest, 'sessionId'> {}
export interface NetworkConnectionConfiguration {} // TODO: add fields
