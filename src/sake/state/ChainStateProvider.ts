import {
    StateId,
    ChainState,
    AppState,
    ChainInfo,
    ChainStatus,
    NetworkId
} from '../webview/shared/types';
import { BaseStateProvider } from './BaseStateProvider';

export class ChainStateProvider extends BaseStateProvider<ChainState> {
    private static _instance: ChainStateProvider;

    private constructor() {
        super(StateId.Chain, {
            chains: [],
            currentChainId: undefined
        });
    }

    public static getInstance(): ChainStateProvider {
        if (!this._instance) {
            this._instance = new ChainStateProvider();
        }
        return this._instance;
    }

    public addChain(chain: ChainInfo) {
        this.state = {
            ...this._state,
            chains: [...this._state.chains, chain]
        };
    }

    public removeChain(chainId: string) {
        this.state = {
            ...this._state,
            chains: this._state.chains.filter((chain) => chain.chainId !== chainId)
        };
    }

    public getChain(chainId: string): ChainInfo | undefined {
        return this._state.chains.find((chain) => chain.chainId === chainId);
    }

    public setChainStatus(chainId: string, status: ChainStatus) {
        this.state = {
            ...this._state,
            chains: this._state.chains.map((chain) =>
                chain.chainId === chainId ? { ...chain, status: status } : chain
            )
        };
    }

    public setCurrentChainId(chainId: string | undefined) {
        this.state = {
            ...this._state,
            currentChainId: chainId
        };
    }

    public setLocalNodesDisconnectedStatus() {
        this.state = {
            ...this._state,
            chains: this._state.chains.filter((chain) =>
                chain.network === NetworkId.LocalNode
                    ? {
                          ...chain,
                          status: ChainStatus.Disconnected
                      }
                    : chain
            )
        };
    }
}

// TODO this needs splitting into serverstate and chainsstate, possibly also add appstate?
