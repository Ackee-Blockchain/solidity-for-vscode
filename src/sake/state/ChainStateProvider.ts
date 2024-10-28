import { StateId, ChainState, AppState, ChainInfo, NetworkId } from '../webview/shared/types';
import BaseStateProvider from './BaseStateProvider';

export default class ChainStateProvider extends BaseStateProvider<ChainState> {
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
        if (this._state.chains.find((c) => c.chainId === chain.chainId)) {
            throw new Error('Chain already added');
        }
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

    public setCurrentChainId(chainId: string | undefined) {
        this.state = {
            ...this._state,
            currentChainId: chainId
        };
    }

    public setChainConnectionStatus(chainId: string, connected: boolean) {
        // check if chain exists
        const chain = this._state.chains.find((chain) => chain.chainId === chainId);
        if (!chain) {
            return;
        }
        this.state = {
            ...this._state,
            chains: this._state.chains.map((chain) =>
                chain.chainId === chainId ? { ...chain, connected } : chain
            )
        };
    }

    public set state(_state: ChainState) {
        this._state = _state;
        this._sendUpdateMessage();
    }
}

// TODO this needs splitting into serverstate and chainsstate, possibly also add appstate?
