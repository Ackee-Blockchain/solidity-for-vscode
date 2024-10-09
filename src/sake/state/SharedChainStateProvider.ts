import { StateId, SharedChainState, ChainState } from '../webview/shared/types';
import { BaseStateProvider } from './BaseStateProvider';

export class SharedChainStateProvider extends BaseStateProvider<SharedChainState> {
    private static _instance: SharedChainStateProvider;

    private constructor() {
        super(StateId.Chains, {
            isAnvilInstalled: undefined,
            isWakeServerRunning: undefined,
            chains: [],
            currentChainId: undefined
        });
    }

    public static getInstance(): SharedChainStateProvider {
        if (!this._instance) {
            this._instance = new SharedChainStateProvider();
        }
        return this._instance;
    }

    public setIsAnvilInstalled(isAnvilInstalled: boolean) {
        this.state = {
            ...this._state,
            isAnvilInstalled: isAnvilInstalled
        };
    }

    public setIsWakeServerRunning(isWakeServerRunning: boolean) {
        this.state = {
            ...this._state,
            isWakeServerRunning: isWakeServerRunning
        };
    }

    public addChain(chain: ChainState) {
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

    public getChain(chainId: string): ChainState | undefined {
        return this._state.chains.find((chain) => chain.chainId === chainId);
    }
}

// TODO this needs splitting into serverstate and chainsstate, possibly also add appstate?
