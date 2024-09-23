import {
    CompilationIssue,
    CompilationState,
    CompiledContract,
    ContractAbi,
    StateId
} from '../webview/shared/types';
import { BaseState } from './BaseState';

export class CompilationState extends BaseState<CompilationState> {
    private static _instance: CompilationState;

    private constructor() {
        super(StateId.CompiledContracts, {
            contracts: [],
            issues: [],
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

    public set(contracts: CompiledContract[], issues: CompilationIssue[]) {
        this.state = {
            contracts: contracts,
            issues: issues,
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

    public setIssues(issues: CompilationIssue[]): void {
        this.state = {
            ...this.state,
            issues: issues
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
