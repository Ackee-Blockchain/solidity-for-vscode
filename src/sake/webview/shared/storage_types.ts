import type {
    DeploymentState,
    AccountState,
    TransactionHistoryState,
    ChainState,
    AppState,
    CompilationState,
    NetworkId,
    WakeDumpStateResponse,
    NetworkConfiguration,
    WakeSakeStateMetadata
} from './types';

export interface StoredSakeState {
    sharedState: SharedState;
    providerStates: ProviderState[];
}

export interface ProviderState {
    id: string;
    displayName: string;
    state: {
        accounts: AccountState;
        deployment: DeploymentState;
        history: TransactionHistoryState;
    };
    network: NetworkState;
}

export interface SharedState {
    chains: ChainState;
    compilation: CompilationState;
}

export type NetworkState = LocalNodeNetworkState; // | other network types

export interface BaseNetworkState {
    type: NetworkId;
}

export interface WakeChainDump extends Omit<WakeDumpStateResponse, 'success'> {}

export interface LocalNodeNetworkState extends BaseNetworkState {
    type: NetworkId.LocalNode;
    wakeDump: WakeChainDump;
    config: NetworkConfiguration;
}
