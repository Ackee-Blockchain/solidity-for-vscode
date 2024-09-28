import {
    CompilationIssue,
    CompilationIssueType,
    CompiledContract,
    WakeCompilationErrors,
    WakeCompilationSkipped,
    WakeCompiledContracts
} from '../webview/shared/types';

export function parseCompiledContracts(
    compilationResult: WakeCompiledContracts
): Array<CompiledContract> {
    // Wake returns an object with a key "fqn:contractName" and value contractAbi
    // this needs to be converted to an array of CompiledContract

    let contracts: Array<CompiledContract> = [];

    let key: keyof WakeCompiledContracts;
    for (key in compilationResult) {
        // split the key to get the contract name
        const [_fqn, _contractName] = key.split(':');

        const contract: CompiledContract = {
            fqn: key,
            name: _contractName,
            abi: compilationResult[key].abi,
            isDeployable: compilationResult[key].isDeployable
        };

        // console.log('contract', contract.fqn, contract.isDeployable);

        if (contract.isDeployable) {
            contracts.push(contract);
        }
    }

    // filter out contracts with no abi -> libraries
    contracts = contracts.filter((contract) => contract.abi.length > 0);

    return contracts;
}

export function parseCompilationIssues(
    compilationErrors: WakeCompilationErrors
): CompilationIssue[] {
    const errors: CompilationIssue[] = [];

    let key: keyof WakeCompiledContracts;
    for (key in compilationErrors) {
        const error: CompilationIssue = {
            type: CompilationIssueType.Error,
            fqn: key,
            errors: compilationErrors[key]
        };

        errors.push(error);
    }

    return errors;
}

export function parseCompilationSkipped(
    compilationSkipped: WakeCompilationSkipped
): CompilationIssue[] {
    const errors: CompilationIssue[] = [];

    let key: keyof WakeCompiledContracts;
    for (key in compilationSkipped) {
        const error: CompilationIssue = {
            type: CompilationIssueType.Skipped,
            fqn: key,
            errors: [compilationSkipped[key]]
        };

        errors.push(error);
    }

    return errors;
}

export function getNameFromContractFqn(fqn: string): string {
    return fqn.split(':')[1];
}
