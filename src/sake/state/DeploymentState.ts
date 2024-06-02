import { DeploymentStateData, StateId } from "../webview/shared/types";
import { BaseState } from "./BaseState";

export class DeploymentState extends BaseState<DeploymentStateData[]> {
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

    public deploy(contract: DeploymentStateData) {
        // TODO validate payload
        const _state = [...this.state, contract];
        this.state = _state;
    }

    public undeploy(contract: DeploymentStateData) {
        const _state = this.state.filter((c) => c.address !== contract.address);
        this.state = _state;
    }

    public getDict() {
        return this.state.reduce((acc, contract) => {
            acc[contract.address] = contract;
            return acc;
        }, {} as Record<string, DeploymentStateData>);
    }
}