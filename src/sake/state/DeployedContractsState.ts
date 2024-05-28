import { DeployedContractState, StateId } from "../webview/shared/types";
import { BaseState } from "./BaseState";

export class DeployedContractsState extends BaseState<DeployedContractState[]> {
    private static _instance: DeployedContractsState;

    private constructor() {
        super(StateId.DeployedContracts, []);
    }

    public static getInstance(): DeployedContractsState {
        if (!this._instance) {
            this._instance = new DeployedContractsState();
        }
        return this._instance;
    }

    public deploy(contract: DeployedContractState) {
        // TODO validate payload
        const _state = [...this.state, contract];
        this.state = _state;
    }

    public undeploy(contract: DeployedContractState) {
        const _state = this.state.filter((c) => c.address !== contract.address);
        this.state = _state;
    }
}