import { decodeParameters } from 'web3-eth-abi';
import { AbiInput } from 'web3-types';
import { AbiFunctionFragment, TransactionDecodedReturnValue } from '../webview/shared/types';

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

    const _out: any[] = [];
    for (let i = 0; i < decoded.__length__; i++) {
        const _outputField = func.outputs[i];

        // @dev BigInt values need to be converted to strings as they cannot be serialized
        const _value =
            typeof decoded[i] === 'bigint' ? (decoded[i] as bigint).toString() : decoded[i];

        _out.push({
            name: _outputField.name
                ? `${_outputField.name} [${_outputField.internalType}]`
                : _outputField.internalType,
            value: _value
        });
    }

    return _out;
}
