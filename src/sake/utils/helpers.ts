import * as WakeApi from '../api/wake';
import { SakeContext } from '../context';
import { AbiFunctionFragment, CallType, SignalId, WebviewMessageId } from '../webview/shared/types';

export async function pingWakeServer() {
    return await WakeApi.ping().catch((_) => {
        return false;
    });
}

export function sendSignalToWebview(signal: SignalId, data?: any) {
    const webview = SakeContext.getInstance().webviewProvider;
    if (!webview) {
        console.error(`A signal (${signal}) was requested but no webview was found.`);
        return;
    }
    webview.postMessageToWebview({
        command: WebviewMessageId.onSignal,
        signalId: signal,
        payload: data
    });
}

export function specifyCallType(func: AbiFunctionFragment): CallType {
    return func.stateMutability === 'view' || func.stateMutability === 'pure'
        ? CallType.Call
        : CallType.Transact;
}

export function serialize(state: any): string {
    return JSON.stringify(state, (key, value) =>
        typeof value === 'bigint' ? value.toString() : value
    );
}

export function serializeDeep(state: any): string {
    return JSON.stringify(state, (key, value) => {
        if (typeof value === 'bigint') {
            return value.toString();
        }
        if (typeof value === 'object' && value !== null) {
            return serializeDeep(value);
        }
        return value;
    });
}
