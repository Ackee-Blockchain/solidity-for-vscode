import { NetworkId } from '../webview/shared/network_types';
import SakeState from './SakeState';

export interface ChainState {
    id: string;
    states: SakeState;
    connected: boolean;
    name: string;
    network: NetworkId;
}

export class Hook<T> implements IHook<T> {
    private state: T;
    private subscribers: ((state: T) => void)[] = [];

    constructor(initialState: T) {
        this.state = initialState;
    }

    set(state: T): void {
        this.state = state;
        this.notifySubscribers();
    }

    setLazy(partialState: Partial<T>): void {
        this.state = {
            ...this.state,
            ...partialState
        };
        this.notifySubscribers();
    }

    get(): T {
        return this.state;
    }

    subscribe(callback: (state: T) => void): () => void {
        this.subscribers.push(callback);
        return () => {
            this.subscribers = this.subscribers.filter((cb) => cb !== callback);
        };
    }

    private notifySubscribers(): void {
        this.subscribers.forEach((callback) => callback(this.state));
    }
}

export interface IHook<T> {
    set: (state: T) => void;
    setLazy: (partialState: Partial<T>) => void;
    get: () => T;
    subscribe: (callback: (state: T) => void) => () => void;
}

export interface ChainHook extends IHook<ChainState> {}

export const chainRegistry = {
    states: new Map<string, ChainHook>(),
    subscribers: [] as (() => void)[],

    getHook(id: string): ChainHook | undefined {
        return this.states.get(id);
    },

    contains(id: string): boolean {
        return this.states.has(id);
    },

    get(id: string): ChainState | undefined {
        return this.states.get(id)?.get();
    },

    getAll(): ChainState[] {
        return Array.from(this.states.values()).map((state) => state.get());
    },

    add(id: string, name: string, network: NetworkId): void {
        if (this.contains(id)) {
            throw new Error('Chain with id ' + id + ' already exists');
        }

        const hook = useChainState(id, name, network);
        this.states.set(id, hook);
        this.notifyUpdate();
    },

    delete(id: string): void {
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

function useChainState(id: string, name: string, network: NetworkId) {
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

    hook = new Hook<ChainState>(state);
    const wrappedHook = {
        ...hook,
        set: (_state: ChainState) => {
            hook.set(_state);
            chainRegistry.notifyUpdate();
        },
        setLazy: (partialState: Partial<ChainState>) => {
            hook.setLazy(partialState);
            chainRegistry.notifyUpdate();
        }
    } as ChainHook;

    return wrappedHook;
}

export interface AdditionalSakeState {
    currentChainId?: string;
}

export const additionalSakeState = new Hook<AdditionalSakeState>({
    currentChainId: undefined
});
