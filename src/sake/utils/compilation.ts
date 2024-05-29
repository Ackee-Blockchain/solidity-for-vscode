import { CompiledContract, WakeCompiledContract } from "../webview/shared/types";

export function parseCompilationResult(compilationResult: WakeCompiledContract): Array<CompiledContract>  {
    // Wake returns an object with a key "fqn:contractName" and value contractAbi
    // this needs to be converted to an array of CompiledContract

    const contracts: Array<CompiledContract> = [];

    let key: keyof WakeCompiledContract;
    for (const key in compilationResult) {

        // split the key to get the contract name
        const [_fqn, _contractName] = key.split(":");

        const contract: CompiledContract = {
            fqn: key,
            name: _contractName,
            abi: compilationResult[key],
        };

        contracts.push(contract);
    }

    return contracts;
}