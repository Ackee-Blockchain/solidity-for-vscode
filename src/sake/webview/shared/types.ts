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
    label?: string;
}

export interface Contract extends Account {
    name: string;
    abi: ContractAbi;
}
