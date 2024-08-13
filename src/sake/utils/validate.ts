import camelcaseKeys from 'camelcase-keys';

export function validate(json: any) {
    return camelcaseKeys(json, { deep: true });
}
