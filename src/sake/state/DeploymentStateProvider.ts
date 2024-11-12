import {
    Address,
    ContractAbi,
    DeployedContract,
    DeployedContractType,
    DeploymentState,
    StateId
} from '../webview/shared/types';
import BaseStateProvider from './BaseStateProvider';

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

    public extendAbi(contractFqn: string, abi: ContractAbi) {
        this.state = this.state.map((c) => {
            if (c.type === DeployedContractType.Compiled && c.fqn === contractFqn) {
                if (c.extendedAbi) {
                    c.extendedAbi.push(abi);
                } else {
                    c.extendedAbi = [abi];
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
