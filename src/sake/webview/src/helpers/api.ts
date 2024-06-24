import { messageHandler } from '@estruyf/vscode/dist/client';
import {
    WebviewMessage,
    type FunctionCallPayload,
    type WakeDeploymentRequestParams,
    type WakeSetBalancesRequestParams
} from '../../shared/types';

export function copyToClipboard(stringToCopy: string) {
    messageHandler.send(WebviewMessage.copyToClipboard, stringToCopy);
}

export async function setBalance(address: string, balance: number): Promise<boolean> {
    const _params: WakeSetBalancesRequestParams = {
        balances: {
            [address]: balance
        }
    };

    const success = await messageHandler.request<boolean>(WebviewMessage.onSetBalances, _params);

    return success;
}

export function functionCall(payload: FunctionCallPayload) {
    messageHandler.send(WebviewMessage.onContractFunctionCall, payload);
}

export function deployContract(
    contractFqn: string,
    sender: string,
    calldata: string,
    value: number = 0
) {
    const _pamars: WakeDeploymentRequestParams = {
        contract_fqn: contractFqn,
        sender: sender,
        calldata: calldata,
        value: value
    };

    messageHandler.send(WebviewMessage.onDeploy, _pamars);
}

export function showErrorMessage(message: string) {
    messageHandler.send(WebviewMessage.onError, message);
}

export function showInfoMessage(message: string) {
    messageHandler.send(WebviewMessage.onInfo, message);
}
