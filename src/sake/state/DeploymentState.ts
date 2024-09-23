import { DeploymentState, StateId } from '../webview/shared/types';
import { BaseState } from './BaseState';

export class DeploymentState extends BaseState<DeploymentState[]> {
    private static _instance: DeploymentState;

    private constructor() {
        super(StateId.DeployedContracts, []);
    }

    public static getInstance(): DeploymentState {
        if (!this._instance) {
            this._instance = new DeploymentState();
        }
        return this._instance;
    }

    public deploy(contract: DeploymentState) {
        // TODO validate payload
        console.log(contract, 'mimimi');
        const _state = [...this.state, contract];
        this.state = _state;
        console.log('deploy', _state);
    }

    public undeploy(contract: DeploymentState) {
        const _state = this.state.filter((c) => c.address !== contract.address);
        this.state = _state;
    }

    public updateContract(contract: DeploymentState) {
        const _state = this.state.map((c) => {
            if (c.address === contract.address) {
                c = contract;
            }
            return c;
        });
        console.log('updateContract', _state);
        this.state = _state;
    }

    public getDict() {
        return this.state.reduce((acc, contract) => {
            acc[contract.address] = contract;
            return acc;
        }, {} as Record<string, DeploymentState>);
    }
}
