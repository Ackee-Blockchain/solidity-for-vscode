import { decodeParameters } from 'web3-eth-abi';
import { ContractFunction, TxDecodedReturnValue } from '../webview/shared/types';

export function decodeCallReturnValue(
    returnValue: string,
    func: ContractFunction
): TxDecodedReturnValue[] {
    if (func.outputs === undefined) {
        return [];
    }

    const decoded = decodeParameters(func.outputs, returnValue);
    if (decoded.__length__ !== func.outputs.length) {
        throw new Error('Decoded length does not match function outputs length');
    }

    const _out: any[] = [];
    for (let i = 0; i < decoded.__length__; i++) {
        const _outputField = func.outputs[i];
        _out.push({
            name: _outputField.name
                ? `${_outputField.name} [${_outputField.internalType}]`
                : _outputField.internalType,
            value: decoded[i]
        });
    }

    return _out;

    // for (const key in decoded) {
    //     if (decoded.hasOwnProperty(key) && key !== '__length__') {
    //         const _value = decoded[key]?.toString();
    //         returnDataDecodedNode.setChildren([
    //             ...returnDataDecodedNode.children,
    //             new SakeOutputItem(
    //                 key,
    //                 _value,
    //                 vscode.TreeItemCollapsibleState.None
    //             ) as BaseOutputItem
    //         ]);
    //     }
    // }

    // return decodeParameters(func.outputs!, returnValue);
}
