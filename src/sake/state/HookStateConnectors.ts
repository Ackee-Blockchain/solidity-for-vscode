import { State } from "vscode-languageclient";
import { SakeContext } from "../context";
import BaseStateProvider from "./BaseStateProvider";
import { AppState, ChainState, StateId } from "../webview/shared/types";
import { additionalSakeState, chainRegistry } from "./ChainRegistry";

/*
 * Only helper classes to provide chain state from hooks to webviews.
 */

export class ChainStateProvider extends BaseStateProvider<ChainState> {
    private static _instance: ChainStateProvider;

    private constructor() {
        super(StateId.Chain, {
            chains: chainRegistry.getAll().map((state) => ({
                chainId: state.id,
                chainName: state.name,
                network: state.network,
                connected: state.connected
            })),
            currentChainId: additionalSakeState.get().currentChainId
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
        
        additionalSakeState.subscribe((state) => {
            this.state = {
                ...this._state,
                ...state
            };
        });
    }

    public static getInstance(): ChainStateProvider {
        if (!this._instance) {
            this._instance = new ChainStateProvider();
        }
        return this._instance;
    }
}

export class AppStateProvider extends BaseStateProvider<AppState> {
    private static _instance: AppStateProvider;

    private constructor() {
        super(StateId.App, {
            isAnvilInstalled: undefined,
            isWakeServerRunning: undefined,
            isOpenWorkspace: undefined,
            initializationState: undefined
        });

        
    }

    public static getInstance(): AppStateProvider {
        if (!this._instance) {
            this._instance = new AppStateProvider();
        }
        return this._instance;
    }
}
