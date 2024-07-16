import { FunctionInputParseError } from './errors';

export function displayEtherValue(value: number | null) {
    if (value === null) {
        return 'N/A';
    }

    if (10 ** 14 <= value && value < 10 ** 23) {
        return `${(value / 10 ** 18).toFixed(4)} ETH`;
    }

    return `${(value / 10 ** 18).toExponential(3)} ETH`;

    // if (value < 10 ** 4) {
    //     // return wei
    //     return `${value} wei`;
    // }

    // if (value < 10 ** 15) {
    //     // return gwei
    //     return `${value.toExponential(3)} gwei`;
    // }

    // if (value < 10 ** 21) {
    //     // return eth
    //     return `${value / 10 ** 18} ether`;
    // }

    // return `${value.toExponential(3)} eth`;
}
