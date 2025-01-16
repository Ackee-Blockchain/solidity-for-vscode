import type { AbiFunctionFragment, Address, HexString, TransactionReceipt } from 'web3-types';
import type {
    WakeCallTrace,
    WakeGetBytecodeResponse,
    WakeGetBytecodeRequestParams
} from './wake_types';

interface BaseCallResponse {
    success: boolean;
    callTrace: WakeCallTrace | null; // @hotfix: this is currently undefined in the response
}

interface BaseTransactionResponse extends BaseCallResponse {
    receipt: TransactionReceipt;
    error?: string;
    events?: string[];
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
    value: string; // @dev encoded bigint
}

export interface DeploymentResponse extends BaseTransactionResponse {
    deployedAddress: Address;
}

/* Call */

export interface CallRequest {
    to: Address;
    from: Address;
    calldata: HexString;
    value: string; // @dev encoded bigint
    functionAbi: AbiFunctionFragment;
}

export interface CallResponse extends BaseCallResponse {
    returnValue: HexString;
}

/* Transact */

export interface TransactRequest extends CallRequest {}

export interface TransactResponse extends BaseTransactionResponse {
    returnValue: HexString;
}

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

export interface NetworkCreationConfiguration extends Omit<CreateLocalChainRequest, 'sessionId'> {}
export interface NetworkConnectionConfiguration {} // TODO: add fields
