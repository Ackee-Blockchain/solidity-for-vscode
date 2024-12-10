import { LocalNodeSakeProvider } from './LocalNodeSakeProvider';

export const providerRegistry = {
    providers: new Map<string, LocalNodeSakeProvider>(),
    addSubscribers: new Set<(id: string) => void>(),
    deleteSubscribers: new Set<(id: string) => void>(),

    subscribeAdd(callback: (id: string) => void): () => void {
        this.addSubscribers.add(callback);
        return () => {
            this.addSubscribers.delete(callback);
        };
    },

    subscribeDelete(callback: (id: string) => void): () => void {
        this.deleteSubscribers.add(callback);
        return () => {
            this.deleteSubscribers.delete(callback);
        };
    },

    unsubscribeDelete(callback: (id: string) => void): void {
        this.deleteSubscribers.delete(callback);
    },

    get(id: string): LocalNodeSakeProvider {
        return this.providers.get(id)!;
    },

    getAll(): LocalNodeSakeProvider[] {
        return Array.from(this.providers.values());
    },

    add(id: string, provider: LocalNodeSakeProvider): void {
        if (this.providers.has(id)) {
            throw new Error('Provider with id ' + id + ' already exists');
        }

        this.providers.set(id, provider);
        this.addSubscribers.forEach((callback) => callback(id));
    },

    delete(id: string): void {
        if (!this.providers.has(id)) {
            return;
        }

        this.providers.delete(id);
        this.deleteSubscribers.forEach((callback) => callback(id));
    }
};
