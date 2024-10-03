import * as w3t from 'web3-types';
import type { CallOperation, CallType } from './network_types';

export interface WakeCompiledContracts {
    [key: string]: {
        abi: w3t.ContractAbi;
        isDeployable: boolean /* interfaces are not deployable */;
    };
}

export type WakeErrorInfo = {
    message: string;
    path: string;
    startOffset: number;
    endOffset: number;
};

export type WakeSkippedInfo = {
    message: string;
    path: string;
};

export type WakeCompilationErrors = { [key: string]: WakeErrorInfo[] };
export type WakeCompilationSkipped = { [key: string]: WakeSkippedInfo };

/*
 *
 * Wake API
 *
 */

/* Base */

export interface WakeBaseResponse {
    success: boolean;
}

interface WakeTransaction extends WakeBaseResponse {
    receipt?: w3t.TransactionReceipt;
    callTrace: WakeCallTrace;
}

/* Get Accounts */

export type WakeGetAccountsResponse = w3t.Address[];

/* Compilation */

export interface WakeCompilationResponse extends WakeBaseResponse {
    contracts: WakeCompiledContracts;
    errors: WakeCompilationErrors;
    skipped: WakeCompilationSkipped;
    success: boolean;
}

/* Deployment */

export interface WakeDeploymentRequestParams {
    contractFqn: string;
    sender: string;
    calldata: string;
    value: number;
}

export interface WakeDeploymentResponse extends WakeTransaction {
    deployedAddress?: w3t.Address;
}

// export interface WakeDeployedContract {
//     type: string;
//     status: string;
//     cumulativeGasUsed: string;
//     logs: any[];
//     logsBloom: string;
//     transactionHash: string;
//     transactionIndex: string;
//     blockHash: string;
//     blockNumber: string;
//     gasUsed: string;
//     effectiveGasPrice: string;
//     from: string;
//     to: string | undefined;
//     contractAddress: string;
//     root: string;
// }

/* Call */

export interface WakeCallRequestParams {
    contractAddress: string;
    sender: string;
    calldata: string;
    value: number;
}

export interface WakeTransactRequestParams extends WakeCallRequestParams {}

export interface WakeCallResponse extends WakeTransaction {
    returnValue: w3t.HexString; // might need to change to hex string
}

export interface WakeTransactResponse extends WakeCallResponse {}

/* Get Balances */

export interface WakeGetBalancesRequestParams {
    addresses: string[];
}

export interface WakeGetBalancesResponse extends WakeBaseResponse {
    balances: { [key: w3t.Address]: number };
}

/* Set Balances */

export interface WakeSetBalancesRequestParams {
    balances: { [key: w3t.Address]: number };
}

export interface WakeSetBalancesResponse extends WakeBaseResponse {}

/* Set Label */

export interface WakeSetLabelRequestParams {
    address: w3t.Address;
    label?: string;
}

export interface WakeSetLabelResponse extends WakeBaseResponse {}

/* Get Bytecode */

export interface WakeGetBytecodeRequestParams {
    contractFqn: string;
}

export interface WakeGetBytecodeResponse extends WakeBaseResponse {
    bytecode: w3t.HexString;
}

/*
 *
 * Types
 *
 */

export interface WakeCallTrace {
    address: string | null;
    arguments: string | null;
    callType: 'Call' | 'DelegateCall' | 'StaticCall' | 'Callcode' | 'Create' | 'Create2' | null;
    contractName: string | null;
    error: string | null;
    functionName: string | null;
    gas: string | null;
    returnValue: string | null;
    sender: string | null;
    status: string | null;
    value: string | null;
    subtraces: WakeCallTrace[];
}

/*
 *
 * Transactions
 *
 */

// TODO change this when adding testnet/mainnet support
// move to network_types

export type TransactionReceipt = w3t.TransactionReceipt;

export interface TransactionResultBase {
    type: CallOperation;
    success: boolean;
    from: string;
    receipt?: w3t.TransactionReceipt;
    callTrace?: WakeCallTrace;
}

export interface TransactionDeploymentResult extends TransactionResultBase {
    type: CallOperation.Deployment;
    contractName: string;
    contractAddress?: w3t.Address;
}

export interface TransactionCallResult extends TransactionResultBase {
    type: CallOperation.FunctionCall;
    callType: CallType;
    to: w3t.Address; // TODO maybe this could be joined with deployed address
    functionName: string;
    returnData: TransactionReturnData;
}

export type TransactionResult = TransactionDeploymentResult | TransactionCallResult;

// TODO this should probably be moved to types
export interface TransactionDecodedReturnValue {
    name: string;
    value: string;
}

export interface TransactionReturnData {
    bytes: string;
    decoded?: Array<TransactionDecodedReturnValue>;
}

// TODO remove
// export interface TxReceipt {
//     [key: string]: any;
// }
