import { DeployedContract, DeploymentState, StateId } from '../webview/shared/types';
import { BaseStateProvider } from './BaseStateProvider';

export class DeploymentStateProvider extends BaseStateProvider<DeploymentState> {
    constructor() {
        super(StateId.DeployedContracts, []);
    }

    public add(contract: DeployedContract) {
        // TODO validate payload
        const _state = [...this.state, contract];
        this.state = _state;
    }

    public remove(contract: DeployedContract) {
        const _state = this.state.filter((c) => c.address !== contract.address);
        this.state = _state;
    }

    public updateContract(contract: DeployedContract) {
        const _state = this.state.map((c) => {
            if (c.address === contract.address) {
                c = contract;
            }
            return c;
        });
        console.log('updateContract', _state);
        this.state = _state;
    }

    // TODO remove
    // public getDict() {
    //     return this.state.reduce((acc, contract) => {
    //         acc[contract.address] = contract;
    //         return acc;
    //     }, {} as Record<string, DeploymentState>);
    // }
}
