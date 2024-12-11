import { createHash } from 'crypto';

export function fingerprint(state: any) {
    const stateStr = JSON.stringify(state);
    return createHash('sha256').update(stateStr).digest('hex');
}
