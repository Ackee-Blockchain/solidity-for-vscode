import * as WakeApi from '../api/wake';
import { SakeContext } from '../context';
import { SignalId, WebviewMessageId } from '../webview/shared/types';

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
