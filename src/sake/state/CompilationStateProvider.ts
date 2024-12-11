import {
    CompilationIssue,
    CompilationState,
    CompiledContract,
    StateId
} from '../webview/shared/types';
import appState from './AppStateProvider';
import BaseStateProvider from './BaseStateProvider';

export default class CompilationStateProvider extends BaseStateProvider<CompilationState> {
    private static _instance: CompilationStateProvider;

    private constructor() {
        super(StateId.CompiledContracts, {
            contracts: [],
            issues: [],
            dirty: true
        });

        // listener to remove compilation when wake crashes
        appState.subscribe((state) => {
            if (!state.isWakeServerRunning) {
                this.state = {
                    contracts: [],
                    issues: [],
                    dirty: true
                };
            }
        });
    }

    public static getInstance(): CompilationStateProvider {
        if (!this._instance) {
            this._instance = new CompilationStateProvider();
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

    public setCompilation(contracts: CompiledContract[]): void {
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
        return this.state.contracts.reduce(
            (dict, contract) => {
                dict[contract.fqn] = contract;
                return dict;
            },
            {} as Record<string, CompiledContract>
        );
    }

    public get(contractFqn: string): CompiledContract | undefined {
        return this.state.contracts.find((contract) => contract.fqn === contractFqn);
    }
}
