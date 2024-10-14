import type { Address, ContractAbi, ExtendedAccount, TransactionResult } from './types';

export enum StateId {
    DeployedContracts = 'DeployedContracts',
    CompiledContracts = 'CompiledContracts',
    Accounts = 'Accounts',
    TransactionHistory = 'TransactionHistory',
    Chains = 'Chains'
}

/* Account */

export type AccountState = ExtendedAccount[];

/* Deployment */

export interface DeployedContract extends ExtendedAccount {
    abi: ContractAbi;
    nick?: string;
    name: string;
}

export type DeploymentState = DeployedContract[];

/* Compilation */

export enum CompilationIssueType {
    Error = 'Error',
    Skipped = 'Skipped'
}

export interface CompilationErrorSpecific {
    message: string;
    path: string;
    startOffset?: number;
    endOffset?: number;
}

export interface CompilationIssue {
    type: CompilationIssueType;
    fqn: string;
    errors: CompilationErrorSpecific[];
}

export interface CompiledContract {
    fqn: string;
    name: string;
    abi: ContractAbi;
    isDeployable: boolean;
    // TODO join this type with contract
}

export interface CompilationState {
    contracts: Array<CompiledContract>;
    issues: CompilationIssue[];
    dirty: boolean;
    // TODO add isDirty
}

/* Chain */

export interface SharedChainState {
    isAnvilInstalled?: boolean;
    isWakeServerRunning?: boolean;
    chains: ChainState[];
    currentChainId: string | undefined;
}

export enum NetworkType {
    Local = 'Local',
    Remote = 'Remote'
}

export interface ChainState {
    chainId: string;
    network: string;
    connected: boolean;
}

/* Transaction History */

export type TransactionHistoryState = TransactionResult[];
