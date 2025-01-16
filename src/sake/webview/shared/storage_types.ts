import type {
    AccountState,
    ChainPersistence,
    DeploymentState,
    NetworkConfiguration,
    NetworkType,
    TransactionHistoryState,
    WakeDumpStateResponse
} from './types';

export interface StoredSakeState {
    sharedState?: SharedState;
    providerStates: ProviderState[];
}

export enum SakeProviderType {
    LocalNode = 'local_node',
    Connection = 'connection'
}

type BaseProviderState = {
    id: string;
    type: SakeProviderType;
    displayName: string;
    persistence: ChainPersistence;
};

export type ProviderState =
    | ({
          type: SakeProviderType.LocalNode;
          state: {
              accounts: AccountState;
              deployment: DeploymentState;
              history: TransactionHistoryState;
          };
          stateFingerprint: string;
          network: BaseWakeNetworkState;
      } & BaseProviderState)
    | ({
          type: SakeProviderType.Connection;
          state: {
              accounts: AccountState;
              //   deployment: DeploymentState;
              //   history: TransactionHistoryState;
          };
          stateFingerprint: string;
          network: Omit<BaseWakeNetworkState, 'wakeDump'>;
      } & BaseProviderState);

export type NetworkState = BaseWakeNetworkState | Omit<BaseWakeNetworkState, 'wakeDump'>;

export interface BaseWakeNetworkState {
    type: NetworkType.Local;
    wakeDump: WakeChainDump;
    // @dev currently wake cannot recreate on the same uri, on chain creation these 2 params are returned
    config: Omit<NetworkConfiguration, 'type' | 'uri'>;
}

export interface WakeChainDump extends Omit<WakeDumpStateResponse, 'success'> {}

export enum SakeProviderInitializationRequestType {
    CreateNew = 'CreateNew',
    LoadFromState = 'LoadFromState'
}

export interface SharedState {
    lastUsedChain?: string;
    // chains: ChainState;
    // @hotfix: compilation state is not loaded until wake is able to save it in state dump
    // compilation: CompilationState;
}

export type SakeProviderInitializationRequest = SakeLocalNodeProviderInitializationRequest; // | other provider types

export type SakeLocalNodeProviderInitializationRequest =
    | {
          type: SakeProviderInitializationRequestType.CreateNew;
          accounts?: number;
      }
    | {
          type: SakeProviderInitializationRequestType.LoadFromState;
          state: ProviderState;
      };
