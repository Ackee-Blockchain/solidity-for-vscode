import { v4 as uuidv4 } from 'uuid';
import { GenericHook } from '../../utils/hook';
import {
    Address,
    DeployedContract,
    DeploymentState,
    ImplementationContract
} from '../../webview/shared/types';

export class DeploymentStateProvider extends GenericHook<DeploymentState> {
    constructor() {
        super([]);
    }

    public add(contract: DeployedContract) {
        // TODO validate payload
        this.set([...this.get(), contract]);
    }

    public remove(address: Address) {
        this.set(this.get().filter((c) => c.address !== address));
    }

    public update(contract: DeployedContract) {

        this.set(
            this.get().map((c) => {
                if (c.address === contract.address) {
                    c = contract;
                }
                return c;
            })
        );
    }

    public setLabel(address: Address, label?: string) {
        this.set(
            this.get().map((c) => {
                if (c.address === address) {
                    c.label = label;
                }
                return c;
            })
        );
    }

    public extendProxySupport(
        address: Address,
        implementation: Omit<ImplementationContract, 'id'>
    ) {
        // @dev specific id has to be generated, because abi can be fetched onchain (only has address),
        // taken from compiled contract (only has fqn) or even copy pasted (has nothing identifiable)
        const implementationWithId = { ...implementation, id: uuidv4() };
        this.set(
            this.get().map((c) => {
                if (c.address === address) {
                    if (c.proxyFor) {
                        c.proxyFor.push(implementationWithId);
                } else {
                    c.proxyFor = [implementationWithId];
                    }
                }
                return c;
            })
        );
    }

    public removeProxy(address: Address, proxyId: string) {
        this.set(
            this.get().map((c) => {
                if (c.type && c.address === address) {
                    if (proxyId) {
                        c.proxyFor = c.proxyFor?.filter((p) => p.id !== proxyId);
                    } else {
                        c.proxyFor = undefined;
                    }
                }
                return c;
            })
        );
    }

    // TODO remove
    // public getDict() {
    //     return this.state.reduce((acc, contract) => {
    //         acc[contract.address] = contract;
    //         return acc;
    //     }, {} as Record<string, DeploymentState>);
    // }
}
