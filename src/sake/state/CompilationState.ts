import { CompilationStateData, ContractAbi, StateId } from "../webview/shared/types";
import { BaseState } from "./BaseState";

export class CompilationState extends BaseState<CompilationStateData> {
    private static _instance: CompilationState;

    private constructor() {
        super(StateId.CompiledContracts,
            {
                contracts: [],
                dirty: true
            }
        );
    }

    public static getInstance(): CompilationState {
        if (!this._instance) {
            this._instance = new CompilationState();
        }
        return this._instance;
    }

    public makeDirty(): void {
        this.state = {
            ...this.state,
            dirty: true,
        };
    }

    public setCompilation(contracts: Array<ContractAbi>): void {
        this.state = {
            contracts: contracts,
            dirty: false,
        };
    }
}