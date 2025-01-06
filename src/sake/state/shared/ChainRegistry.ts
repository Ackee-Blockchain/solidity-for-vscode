import { ISakeProvider } from '../../sake_providers/BaseSakeProvider';
import { MapHook } from '../../utils/hook';

class ChainRegistry extends MapHook<string, ISakeProvider> {
    constructor() {
        super(new Map<string, ISakeProvider>());
    }

    public get(id: string): ISakeProvider | undefined {
        return this.state.get(id);
    }

    public getAll(): ISakeProvider[] {
        return Array.from(this.state.values());
    }

    public add(id: string, provider: ISakeProvider): void {
        if (this.contains(id)) {
            throw new Error('Chain with id ' + id + ' already exists');
        }

        provider.subscribe(() => {
            this.notify();
        });

        this.state.set(id, provider);
        this.notifyAdd(id);
    }

    public delete(id: string): void {
        this.state.delete(id);
        this.notifyDelete(id);
    }
}

export const chainRegistry = new ChainRegistry();
