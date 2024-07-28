import {
    CompilationError,
    CompilationErrorType,
    CompiledContract,
    WakeCompilationErrors,
    WakeCompilationSkipped,
    WakeCompiledContract
} from '../webview/shared/types';

export function parseCompiledContracts(
    compilationResult: WakeCompiledContract
): Array<CompiledContract> {
    // Wake returns an object with a key "fqn:contractName" and value contractAbi
    // this needs to be converted to an array of CompiledContract

    let contracts: Array<CompiledContract> = [];

    let key: keyof WakeCompiledContract;
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

export function parseCompilationErrors(
    compilationErrors: WakeCompilationErrors
): CompilationError[] {
    const errors: CompilationError[] = [];

    let key: keyof WakeCompiledContract;
    for (key in compilationErrors) {
        const error: CompilationError = {
            type: CompilationErrorType.Error,
            fqn: key,
            errors: compilationErrors[key]
        };

        errors.push(error);
    }

    return errors;
}

export function parseCompilationSkipped(
    compilationSkipped: WakeCompilationSkipped
): CompilationError[] {
    const errors: CompilationError[] = [];

    let key: keyof WakeCompiledContract;
    for (key in compilationSkipped) {
        const error: CompilationError = {
            type: CompilationErrorType.Skipped,
            fqn: key,
            errors: compilationSkipped[key]
        };

        errors.push(error);
    }

    return errors;
}

export function getNameFromContractFqn(fqn: string): string {
    return fqn.split(':')[1];
}
