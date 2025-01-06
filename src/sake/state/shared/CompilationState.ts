import { GenericHook } from '../../utils/hook';
import { CompilationIssue, CompilationState, CompiledContract } from '../../webview/shared/types';
import appState from './AppState';

export class CompilationStateProvider extends GenericHook<CompilationState> {
    constructor() {
        super({
            contracts: [],
            issues: [],
            dirty: true
        });

        // listener to remove compilation when wake crashes
        appState.subscribe((state) => {
            if (!state.isWakeServerRunning) {
                this.set({
                    contracts: [],
                    issues: [],
                    dirty: true
                });
            }
        });
    }

    public makeDirty(): void {
        this.setLazy({
            dirty: true
        });
    }

    public setBoth(contracts: CompiledContract[], issues: CompilationIssue[]) {
        this.set({
            contracts: contracts,
            issues: issues,
            dirty: false
        });
    }

    public setCompilation(contracts: CompiledContract[]): void {
        this.setLazy({
            contracts: contracts,
            dirty: false
        });
    }

    public setIssues(issues: CompilationIssue[]): void {
        this.setLazy({
            issues: issues
        });
    }

    public getDict() {
        return this.get().contracts.reduce(
            (dict, contract) => {
                dict[contract.fqn] = contract;
                return dict;
            },
            {} as Record<string, CompiledContract>
        );
    }

    public getContract(contractFqn: string): CompiledContract | undefined {
        return this.get().contracts.find((contract) => contract.fqn === contractFqn);
    }
}

export const compilationState = new CompilationStateProvider();
