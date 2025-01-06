import type { SakeProviderType } from './storage_types';
import type {
    Address,
    ContractAbi,
    ExtendedAccount,
    NetworkConfiguration,
    TransactionResult
} from './types';

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

export enum DeployedContractType {
    Compiled = 'compiled',
    OnChain = 'onchain'
}

export interface ImplementationContract {
    id: string;
    abi: ContractAbi;
    address?: Address;
    name?: string;
}

type BaseDeployedContract = {
    type: DeployedContractType;
    name: string;
    address: Address;
    balance?: number;
    abi: ContractAbi;
    proxyFor?: ImplementationContract[];
} & Omit<ExtendedAccount, 'balance'>;

export type DeployedContract =
    | ({
          type: DeployedContractType.Compiled;
          fqn: string;
      } & BaseDeployedContract)
    | ({
          type: DeployedContractType.OnChain;
      } & BaseDeployedContract);

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
    initializationState: 'initializing' | 'loadingChains' | 'ready' | undefined;
}

export enum NetworkType {
    Local = 'Local Chain'
}

export type NetworkInfo = {
    type: NetworkType.Local;
    config: NetworkConfiguration;
};

export interface ChainState {
    chains: ChainInfo[];
    currentChainId: string | undefined;
}

export interface ChainPersistence {
    isDirty: boolean;
    isAutosaveEnabled: boolean;
    lastSaveTimestamp: number | undefined;
}

export interface ChainInfo {
    type: SakeProviderType;
    chainId: string;
    chainName: string;
    network: NetworkInfo;
    connected: boolean;
    persistence: ChainPersistence;
}

/* Transaction History */

export type TransactionHistoryState = TransactionResult[];
