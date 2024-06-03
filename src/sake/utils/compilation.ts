import { CompiledContract, WakeCompiledContract } from "../webview/shared/types";

export function parseCompilationResult(compilationResult: WakeCompiledContract): Array<CompiledContract>  {
    // Wake returns an object with a key "fqn:contractName" and value contractAbi
    // this needs to be converted to an array of CompiledContract

    let contracts: Array<CompiledContract> = [];

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

    // filter out contracts with no abi -> libraries
    contracts = contracts.filter(contract => contract.abi.length > 0);

    return contracts;
}