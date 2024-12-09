import { NetworkId } from '../webview/shared/network_types';
import SakeState from './SakeState';

export interface ChainState {
    id: string;
    states: SakeState;
    connected: boolean;
    name: string;
    network: NetworkId;
}

export interface ChainHook {
    set: (state: ChainState) => void;
    setLazy: (partialState: any) => void;
    get: () => ChainState;
    subscribe: (callback: () => void) => () => void;
}

export const chainRegistry = {
    states: new Map<string, ChainHook>(),
    subscribers: [] as (() => void)[],

    getHook(id: string): ChainHook | undefined {
        return this.states.get(id);
    },

    contains(id: string): boolean {
        return this.states.has(id);
    },

    getState(id: string): ChainState | undefined {
        return this.states.get(id)?.get();
    },

    getAllStates(): ChainState[] {
        return Array.from(this.states.values()).map((state) => state.get());
    },

    addState(id: string, state: ChainHook): void {
        this.states.set(id, state);
        this.notifyUpdate();
    },

    deleteState(id: string): void {
        this.states.delete(id);
        this.notifyUpdate();
    },

    subscribe(callback: () => void): () => void {
        this.subscribers.push(callback);
        return () => {
            this.subscribers = this.subscribers.filter((cb) => cb !== callback);
        };
    },

    notifyUpdate() {
        this.subscribers.forEach((callback) => callback());
    }
};

export function useChainState(id: string, name: string, network: NetworkId) {
    let hook: ChainHook | undefined = chainRegistry.getHook(id);

    if (hook !== undefined) {
        return hook;
    }

    let state: ChainState = {
        id: id,
        states: new SakeState(),
        connected: false,
        name: name,
        network: network
    };

    let subscribers: ((state: ChainState) => void)[] = [];

    hook = {
        set: (_state: ChainState) => {
            state = _state;
            chainRegistry.notifyUpdate();
            subscribers.forEach((callback: (state: ChainState) => void) => callback(state));
        },
        setLazy: (partialState: any) => {
            state = {
                ...state,
                ...partialState
            };
            chainRegistry.notifyUpdate();
            subscribers.forEach((callback: (state: ChainState) => void) => callback(state));
        },
        get: () => {
            return state;
        },
        subscribe: (callback: (state: ChainState) => void) => {
            subscribers.push(callback);
            return () => {
                subscribers = subscribers.filter((cb) => cb !== callback);
            };
        }
    } as ChainHook;

    chainRegistry.addState(id, hook);
    return hook;
}
