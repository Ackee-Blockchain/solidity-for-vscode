import type { Address, ContractAbi, ExtendedAccount, TransactionResult } from './types';

export enum StateId {
    DeployedContracts = 'DeployedContracts',
    CompiledContracts = 'CompiledContracts',
    Accounts = 'Accounts',
    TransactionHistory = 'TransactionHistory',
    Chain = 'Chain',
    App = 'App',
    Sake = 'Sake'
}

/* Account */

export type AccountState = ExtendedAccount[];

/* Deployment */

export interface DeployedContract extends ExtendedAccount {
    abi: ContractAbi;
    label?: string;
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
    contracts: CompiledContract[];
    issues: CompilationIssue[];
    dirty: boolean;
    // TODO add isDirty
}

/* Chain */

export interface AppState {
    isAnvilInstalled?: boolean;
    isWakeServerRunning?: boolean;
    isOpenWorkspace: 'open' | 'closed' | 'tooManyWorkspaces' | undefined;
    isInitialized?: boolean;
}

export enum NetworkType {
    Local = 'Local',
    Remote = 'Remote'
}

export interface ChainState {
    chains: ChainInfo[];
    currentChainId: string | undefined;
}

export interface ChainInfo {
    chainId: string;
    chainName: string;
    network: string;
}

/* Transaction History */

export type TransactionHistoryState = TransactionResult[];
