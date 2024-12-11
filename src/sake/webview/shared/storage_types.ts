import type {
    DeploymentState,
    AccountState,
    TransactionHistoryState,
    ChainState,
    AppState,
    CompilationState,
    NetworkType,
    WakeDumpStateResponse,
    NetworkConfiguration,
    WakeSakeStateMetadata,
    NetworkCreationConfiguration
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
    stateFingerprint: string;
}

export interface SharedState {
    // chains: ChainState;
    // @hotfix: compilation state is not loaded until wake is able to save it in state dump
    // compilation: CompilationState;
}

export type NetworkState = LocalNodeNetworkState; // | other network types

export interface BaseNetworkState {
    type: NetworkType;
}

export interface WakeChainDump extends Omit<WakeDumpStateResponse, 'success'> {}

export interface LocalNodeNetworkState extends BaseNetworkState {
    type: NetworkType.Local;
    wakeDump: WakeChainDump;
    // @dev currently wake cannot recreate on the same uri, on chain creation these 2 params are returned
    config: Omit<NetworkConfiguration, 'type' | 'uri'>;
}

export enum SakeProviderInitializationRequestType {
    CreateNewChain = 'CreateNewChain',
    ConnectToChain = 'ConnectToChain',
    LoadFromState = 'LoadFromState'
}

export type SakeProviderInitializationRequest = SakeLocalNodeProviderInitializationRequest; // | other provider types

export type SakeLocalNodeProviderInitializationRequest =
    | {
          type: SakeProviderInitializationRequestType.CreateNewChain;
          accounts?: number;
      }
    | {
          type: SakeProviderInitializationRequestType.LoadFromState;
          state: ProviderState;
      }
    | {
          type: SakeProviderInitializationRequestType.ConnectToChain;
      };
