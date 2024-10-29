export function validateNumber(value: string | undefined): string | null {
    return !isNaN(Number(value)) ? null : 'Invalid number';
}

export function validateNonEmptyString(value: string | undefined): string | null {
    return value != undefined && value.length > 0 ? null : 'String cannot be empty';
}
