import { decodeParameters } from 'web3-eth-abi';
import { ContractFunction } from '../webview/shared/types';

export function decodeCallReturnValue(returnValue: string, func: ContractFunction) {
    if (func.outputs === undefined) {
        return returnValue;
        throw new Error('Function does not have defined outputs');
    }
    return decodeParameters(func.outputs!, returnValue);
}
