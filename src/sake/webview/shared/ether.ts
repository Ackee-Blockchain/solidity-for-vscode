import { FunctionInputParseError } from './errors';

export function displayEtherValue(value: bigint | null): string {
    if (value === null || value === BigInt(0)) {
        return '0 ETH';
    }

    // Convert to Wei string first
    const weiValue = value.toString();

    // Handle Wei (small values)
    if (value < BigInt(1000)) {
        return `${weiValue} Wei`;
    }

    // Handle Gwei (medium values)
    if (value < BigInt(10 ** 12)) {
        const gweiValue = Number(value) / 1e9;
        return `${gweiValue.toFixed(2)} Gwei`;
    }

    // Handle ETH (larger values)
    const ethValue = Number(value) / 1e18;

    // Use regular decimal for reasonable numbers
    if (ethValue >= 0.0001 && ethValue < 1000000) {
        return `${ethValue.toFixed(4)} ETH`;
    }

    // Use scientific notation for very large or very small numbers
    return `${ethValue.toExponential(4)} ETH`;
}
