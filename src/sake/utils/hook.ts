export interface IHook<T> {
    set: (state: T) => void;
    setLazy: (partialState: Partial<T>) => void;
    get: () => T;
    subscribe: (callback: (state: T) => void) => () => void;
}

export class Hook<T> implements IHook<T> {
    private state: T;
    protected subscribers: ((state: T) => void)[] = [];

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