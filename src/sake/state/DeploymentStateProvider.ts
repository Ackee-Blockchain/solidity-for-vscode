import {
    Address,
    ContractAbi,
    DeployedContract,
    DeployedContractType,
    DeploymentState,
    ImplementationContract,
    StateId
} from '../webview/shared/types';
import BaseStateProvider from './BaseStateProvider';
import { v4 as uuidv4 } from 'uuid';

export default class DeploymentStateProvider extends BaseStateProvider<DeploymentState> {
    constructor() {
        super(StateId.DeployedContracts, []);
    }

    public add(contract: DeployedContract) {
        // TODO validate payload
        const _state = [...this.state, contract];
        this.state = _state;
    }

    public remove(address: Address) {
        const _state = this.state.filter((c) => c.address !== address);
        this.state = _state;
    }

    public update(contract: DeployedContract) {
        const _state = this.state.map((c) => {
            if (c.address === contract.address) {
                c = contract;
            }
            return c;
        });
        this.state = _state;
    }

    public setLabel(address: Address, label?: string) {
        this.state = this.state.map((c) => {
            if (c.address === address) {
                c.label = label;
            }
            return c;
        });
    }

    public extendProxySupport(
        address: Address,
        implementation: Omit<ImplementationContract, 'id'>
    ) {
        // @dev specific id has to be generated, because abi can be fetched onchain (only has address),
        // taken from compiled contract (only has fqn) or even copy pasted (has nothing identifiable)
        const implementationWithId = { ...implementation, id: uuidv4() };
        this.state = this.state.map((c) => {
            if (c.type === DeployedContractType.Compiled && c.address === address) {
                if (c.proxyFor) {
                    c.proxyFor.push(implementationWithId);
                } else {
                    c.proxyFor = [implementationWithId];
                }
            }
            return c;
        });
    }

    public removeProxy(address: Address, proxyId: string) {
        this.state = this.state.map((c) => {
            if (c.type === DeployedContractType.Compiled && c.address === address) {
                if (proxyId) {
                    c.proxyFor = c.proxyFor?.filter((p) => p.id !== proxyId);
                } else {
                    c.proxyFor = undefined;
                }
            }
            return c;
        });
    }

    // TODO remove
    // public getDict() {
    //     return this.state.reduce((acc, contract) => {
    //         acc[contract.address] = contract;
    //         return acc;
    //     }, {} as Record<string, DeploymentState>);
    // }
}
