import { decodeParameters } from 'web3-eth-abi';
import { AbiInput } from 'web3-types';
import { AbiFunctionFragment, TransactionDecodedReturnValue } from '../webview/shared/types';
import { parseNestedWithBigInts } from './helpers';

export function decodeCallReturnValue(
    returnValue: string,
    func: AbiFunctionFragment
): TransactionDecodedReturnValue[] {
    if (func.outputs === undefined) {
        return [];
    }

    const decoded = decodeParameters(func.outputs as AbiInput[], returnValue);
    if (decoded.__length__ !== func.outputs.length) {
        throw new Error('Decoded length does not match function outputs length');
    }

    const _out: TransactionDecodedReturnValue[] = [];
    for (let i = 0; i < decoded.__length__; i++) {
        const _outputField = func.outputs[i];

        _out.push({
            name: _outputField.name
                ? `${_outputField.name} [${_outputField.internalType}]`
                : _outputField.internalType!,
            value: parseNestedWithBigInts(decoded[i])
        });
    }

    return _out;
}
