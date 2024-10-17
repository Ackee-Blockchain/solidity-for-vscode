import { messageHandler } from '@estruyf/vscode/dist/client';
import {
    type CallRequest,
    type WakeDeploymentRequestParams,
    type WakeSetBalancesRequestParams,
    type CompiledContract,
    type WakeGetBytecodeResponse,
    WebviewMessageId,
    type WebviewMessageRequest,
    type Address,
    type DeployedContract,
    type GetBytecodeResponse
} from '../../shared/types';
import { deployedContracts } from '../stores/sakeStore';

export function copyToClipboard(stringToCopy: string) {
    const request: WebviewMessageRequest = {
        command: WebviewMessageId.copyToClipboard,
        payload: stringToCopy
    };
    messageHandler.send(request.command, request.payload);
}

export function setBalance(address: string, balance: number) {
    const request: WebviewMessageRequest = {
        command: WebviewMessageId.onSetBalance,
        payload: {
            address,
            balance
        }
    };

    messageHandler.send(request.command, request.payload);
}

export function functionCall(payload: CallRequest) {
    const request: WebviewMessageRequest = {
        command: WebviewMessageId.onContractFunctionCall,
        payload: payload
    };

    messageHandler.send(request.command, request.payload);
}

export function deployContract(
    contractFqn: string,
    sender: string,
    calldata: string,
    value: number = 0
) {
    const request: WebviewMessageRequest = {
        command: WebviewMessageId.onDeploy,
        payload: {
            contractFqn,
            sender,
            calldata,
            value
        }
    };

    messageHandler.send(request.command, request.payload);
}

export function showErrorMessage(message: string) {
    messageHandler.send(WebviewMessageId.onError, message);
}

export function showInfoMessage(message: string) {
    messageHandler.send(WebviewMessageId.onInfo, message);
}

export async function getInputFromTopBar(
    value: string = '',
    title: string | undefined = undefined
) {
    const request: WebviewMessageRequest = {
        command: WebviewMessageId.getTextFromInputBox,
        payload: {
            value,
            title
        }
    };
    return await messageHandler.request<{
        value?: string;
    }>(request.command, request.payload);
}

export async function compileContracts() {
    const request: WebviewMessageRequest = {
        command: WebviewMessageId.onCompile,
        payload: undefined
    };
    await messageHandler.request(request.command, request.payload);
}

export async function removeDeployedContract(address: Address) {
    const request: WebviewMessageRequest = {
        command: WebviewMessageId.onUndeployContract,
        payload: address
    };
    messageHandler.send(request.command, request.payload);
}

export function setLabel(address: Address, label: string) {
    const request: WebviewMessageRequest = {
        command: WebviewMessageId.onSetLabel,
        payload: {
            address,
            label
        }
    };
    messageHandler.send(request.command, request.payload);
}

export async function requestLabel(address: Address) {
    console.log('requestLabel', address);
    const label = await getInputFromTopBar('', 'New Label');
    if (!label || label.value === undefined) {
        return;
    }
    console.log('requestLabel label', label);
    const request: WebviewMessageRequest = {
        command: WebviewMessageId.onSetLabel,
        payload: {
            address,
            label: label.value
        }
    };
    messageHandler.send(request.command, request.payload);
}

export async function navigateTo(
    path: string,
    startOffset: number | undefined,
    endOffset: number | undefined
) {
    const request: WebviewMessageRequest = {
        command: WebviewMessageId.onNavigate,
        payload: { path, startOffset, endOffset }
    };
    messageHandler.send(request.command, request.payload);
}

export async function openExternal(url: string) {
    const request: WebviewMessageRequest = {
        command: WebviewMessageId.onOpenExternal,
        payload: {
            path: url
        }
    };
    messageHandler.send(request.command, request.payload);
}

export async function openSettings(settingsUrl: string) {
    const request: WebviewMessageRequest = {
        command: WebviewMessageId.onOpenSettings,
        payload: settingsUrl
    };
    messageHandler.send(request.command, request.payload);
}

export async function getBytecode(contractFqn: string): Promise<GetBytecodeResponse> {
    const request: WebviewMessageRequest = {
        command: WebviewMessageId.onGetBytecode,
        payload: {
            contractFqn
        }
    };
    return await messageHandler.request<GetBytecodeResponse>(request.command, request.payload);
}

export async function requestNewProvider() {
    const request: WebviewMessageRequest = {
        command: WebviewMessageId.onrequestNewProvider,
        payload: undefined
    };
    messageHandler.send(request.command, request.payload);
}

export async function selectChain(chainId: string) {
    const request: WebviewMessageRequest = {
        command: WebviewMessageId.onSelectChain,
        payload: undefined
    };
    messageHandler.send(request.command, request.payload);
}

export async function restartWakeServer(): Promise<boolean> {
    const request: WebviewMessageRequest = {
        command: WebviewMessageId.onRestartWakeServer,
        payload: undefined
    };
    return await messageHandler.request<boolean>(request.command, request.payload);
}
