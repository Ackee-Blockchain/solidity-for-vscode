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
    // @hotfix: compilation state is not loaded until wake is able to save it in state dump
    // compilation: CompilationState;
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
