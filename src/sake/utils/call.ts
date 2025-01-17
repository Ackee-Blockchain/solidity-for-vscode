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

    const decodedOutputs = decodeParameters(func.outputs as AbiInput[], returnValue);
    if (decodedOutputs.__length__ !== func.outputs.length) {
        throw new Error('Decoded length does not match function outputs length');
    }

    const decodedReturnValues: TransactionDecodedReturnValue[] = [];

    for (let i = 0; i < decodedOutputs.__length__; i++) {
        const outputField = func.outputs[i];

        const fieldName = outputField.name
            ? `${outputField.name} [${outputField.internalType}]`
            : (outputField.internalType ?? '');

        const parsedValue = parseNestedWithBigInts(decodedOutputs[i]);
        const structuredValue = structureDecodedValue(fieldName, parsedValue);

        decodedReturnValues.push(structuredValue);
    }

    return decodedReturnValues;
}

function structureDecodedValue(fieldName: string, value: any): TransactionDecodedReturnValue {
    if (typeof value !== 'object') {
        return { name: fieldName, value };
    }

    if (value.__length__ !== undefined) {
        // value is a struct, contains __length__
        return {
            name: fieldName,
            children: Object.entries(value)
                .filter(([key, _]) => {
                    // Filter out metadata properties
                    return key !== '__length__' && !/^\d+$/.test(key);
                })
                .map(([key, val]) => structureDecodedValue(key, val))
        };
    }

    // value is an array, contains length
    const baseFieldName = fieldName.replace(/\[\d*\]$/, '');
    return {
        name: fieldName,
        children: Object.entries(value)
            .filter(([key, _]) => key !== 'length')
            .map(([index, val]) => structureDecodedValue(`${baseFieldName}[${index}]`, val))
    };
}
