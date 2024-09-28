import type { Account, ContractAbi, TransactionResult } from './types';

export enum StateId {
    DeployedContracts = 'deployedContracts',
    CompiledContracts = 'compiledContracts',
    Accounts = 'accounts',
    TransactionHistory = 'TransactionHistory',
    Wake = 'wake'
}

/* Account */

export type AccountState = Account[];

/* Deployment */

export interface DeployedContract {
    name: string;
    address: string;
    abi: any;
    balance: number | null;
    nick: string | null;
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

/* Wake */

export interface WakeState {
    isAnvilInstalled: boolean | undefined;
    isServerRunning: boolean | undefined;
}

/* Transaction History */

export type TransactionHistoryState = TransactionResult[];
