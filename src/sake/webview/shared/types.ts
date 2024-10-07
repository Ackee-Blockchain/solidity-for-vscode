import * as w3t from 'web3-types';

export * from './wake_types';
export * from './state_types';
export * from './messaging_types';
export * from './network_types';

/*
 *
 * Account and Contract Interfaces
 *
 */

export type Address = w3t.Address;
export type AbiFunctionFragment = w3t.AbiFunctionFragment;
export type AbiConstructorFragment = w3t.AbiConstructorFragment & {
    name: string;
};
export type AbiFragment = w3t.AbiFragment;
export type AbiParameter = w3t.AbiParameter;
export type ContractAbi = w3t.ContractAbi;

export type StateMutability = string | 'nonpayable' | 'payable' | 'pure' | 'view';

export interface Account {
    address: Address;
    balance: number;
}

export interface ExtendedAccount extends Account {
    nick?: string;
}

export interface Contract extends Account {
    name: string;
    abi: ContractAbi;
}

// inherited from Fragment
// export interface ContractFunction {
//     // required
//     inputs: Array<ContractFunctionInput>;
//     stateMutability: StateMutability;
//     type: string;

//     // optional
//     outputs?: Array<ContractFunctionOutput>; // TODO
//     name: string;
//     // displayName: string | undefined;
// }

// export type ContractAbi = Array<AbiFragment>;
// TODO lets try this first

// called AbiParameter in web3-types
// export interface ContractFunctionInput {
//     // required
//     internalType: string;
//     name: string;
//     type: string;

//     // optional
//     components: Array<ContractFunctionInput> | undefined;
// }

// called AbiParameter in web3-types
// export interface ContractFunctionOutput {
//     // required
//     internalType: string;
//     name: string;
//     type: string;

//     // optional
//     components: Array<ContractFunctionOutput> | undefined;
// }

/*
 *
 * Messaging
 *
 */

// TODO create pairs of WebviewMessage and WebviewInput and WebviewOutput

/*
 *
 * Payloads
 *
 */

// /*
//  *
//  * API to Wallet Server
//  *
//  */

// export interface WalletDeploymentData {
//     name: string;
//     abi: ContractAbi;
//     calldata: w3t.HexString;
//     value: number;
//     bytecode: w3t.HexString;
// }
