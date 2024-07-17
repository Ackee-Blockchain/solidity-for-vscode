import {
    CompilationError,
    CompilationStateData,
    CompiledContract,
    ContractAbi,
    StateId
} from '../webview/shared/types';
import { BaseState } from './BaseState';

export class CompilationState extends BaseState<CompilationStateData> {
    private static _instance: CompilationState;

    private constructor() {
        super(StateId.CompiledContracts, {
            contracts: [],
            errors: [],
            dirty: true
        });
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
            dirty: true
        };
    }

    public set(contracts: CompiledContract[], errors: CompilationError[]) {
        this.state = {
            contracts: contracts,
            errors: errors,
            dirty: false
        };
    }

    public setCompilation(contracts: Array<CompiledContract>): void {
        this.state = {
            ...this.state,
            contracts: contracts,
            dirty: false
        };
    }

    public setErrors(errors: CompilationError[]): void {
        this.state = {
            ...this.state,
            errors: errors
        };
    }

    public getDict() {
        return this.state.contracts.reduce((dict, contract) => {
            dict[contract.fqn] = contract;
            return dict;
        }, {} as Record<string, CompiledContract>);
    }

    public getContract(fqn: string): CompiledContract | undefined {
        return this.state.contracts.find((contract) => contract.fqn === fqn);
    }
}
