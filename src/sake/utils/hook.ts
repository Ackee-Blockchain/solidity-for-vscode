export class GenericHook<T> {
    private state: T;
    protected subscribers: ((state: T) => void)[] = [];

    constructor(private initialState: T) {
        this.state = initialState;
    }

    public set(state: T): void {
        this.state = state;
        this.notifySubscribers();
    }

    public setLazy(partialState: Partial<T>): void {
        this.state = {
            ...this.state,
            ...partialState
        };
        this.notifySubscribers();
    }

    public get(): T {
        return this.state;
    }

    public subscribe(callback: (state: T) => void): () => void {
        this.subscribers.push(callback);
        return () => {
            this.subscribers = this.subscribers.filter((cb) => cb !== callback);
        };
    }

    private notifySubscribers(): void {
        this.subscribers.forEach((callback) => callback(this.state));
    }

    public reset(): void {
        this.state = this.initialState;
    }
}

export abstract class MapHook<T1, T2> {
    protected state: Map<T1, T2>;
    protected subscribers: (() => void)[] = [];
    private addSubscribers: ((key: T1) => void)[] = [];
    private deleteSubscribers: ((key: T1) => void)[] = [];

    constructor(initialState: Map<T1, T2>) {
        this.state = initialState;
    }

    public subscribeOnAdd(callback: (key: T1) => void): () => void {
        this.addSubscribers.push(callback);
        return () => {
            this.addSubscribers = this.addSubscribers.filter((cb) => cb !== callback);
        };
    }

    public subscribeOnDelete(callback: (key: T1) => void): () => void {
        this.deleteSubscribers.push(callback);
        return () => {
            this.deleteSubscribers = this.deleteSubscribers.filter((cb) => cb !== callback);
        };
    }

    public subscribe(callback: () => void): () => void {
        this.subscribers.push(callback);
        return () => {
            this.subscribers = this.subscribers.filter((cb) => cb !== callback);
        };
    }

    protected notifyAdd(key: T1): void {
        this.addSubscribers.forEach((callback) => callback(key));
        this.notify();
    }

    protected notifyDelete(key: T1): void {
        this.deleteSubscribers.forEach((callback) => callback(key));
        this.notify();
    }

    protected notify(): void {
        this.subscribers.forEach((callback) => callback());
    }

    public add(key: T1, value: T2): void {
        this.state.set(key, value);
        this.notifyAdd(key);
    }

    public delete(key: T1): void {
        this.state.delete(key);
        this.notifyDelete(key);
    }

    public contains(key: T1): boolean {
        return this.state.has(key);
    }
}
