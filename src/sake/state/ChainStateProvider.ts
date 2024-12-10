import { chainRegistry } from '../sake_providers/ChainRegistry';
import { StateId, ChainState, AppState, ChainInfo, NetworkId } from '../webview/shared/types';
import BaseStateProvider from './BaseStateProvider';

export default class ChainStateProvider extends BaseStateProvider<ChainState> {
    private static _instance: ChainStateProvider;

    private constructor() {
        super(StateId.Chain, {
            chains: [],
            currentChainId: undefined
        });

        chainRegistry.subscribe(() => {
            this.state = {
                ...this._state,
                chains: chainRegistry.getAll().map((state) => ({
                    chainId: state.id,
                    chainName: state.name,
                    network: state.network,
                    connected: state.connected
                }))
            };
        });
    }

    public static getInstance(): ChainStateProvider {
        if (!this._instance) {
            this._instance = new ChainStateProvider();
        }
        return this._instance;
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

    public set state(_state: ChainState) {
        this._state = _state;
        this._sendUpdateMessage();
    }
}

// TODO this needs splitting into serverstate and chainsstate, possibly also add appstate?
