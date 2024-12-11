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
    type GetBytecodeResponse,
    type NetworkCreationConfiguration
} from '../../shared/types';
import { deployedContracts } from './stores';

export function ping(): Promise<boolean> {
    const request: WebviewMessageRequest = {
        command: WebviewMessageId.ping,
        payload: undefined
    };
    return messageHandler.request<boolean>(request.command, request.payload);
}

export function copyToClipboard(stringToCopy: string) {
    const request: WebviewMessageRequest = {
        command: WebviewMessageId.copyToClipboard,
        payload: stringToCopy
    };
    messageHandler.send(request.command, request.payload);
}

export function setBalance(address: string, balance: number) {
    const request: WebviewMessageRequest = {
        command: WebviewMessageId.setBalance,
        payload: {
            address,
            balance
        }
    };

    messageHandler.send(request.command, request.payload);
}

export function functionCall(payload: CallRequest) {
    const request: WebviewMessageRequest = {
        command: WebviewMessageId.contractFunctionCall,
        payload: payload
    };

    messageHandler.send(request.command, request.payload);
}

export function deployContract(
    contractFqn: string,
    sender: string,
    calldata: string,
    value: bigint
) {
    const request: WebviewMessageRequest = {
        command: WebviewMessageId.deploy,
        payload: {
            contractFqn,
            sender,
            calldata,
            value: value.toString()
        }
    };

    messageHandler.send(request.command, request.payload);
}

export function showErrorMessage(message: string) {
    messageHandler.send(WebviewMessageId.showError, message);
}

export function showInfoMessage(message: string) {
    messageHandler.send(WebviewMessageId.showInfo, message);
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
        command: WebviewMessageId.compile,
        payload: undefined
    };
    await messageHandler.request(request.command, request.payload);
}

export async function removeDeployedContract(address: Address) {
    const request: WebviewMessageRequest = {
        command: WebviewMessageId.undeployContract,
        payload: address
    };
    messageHandler.send(request.command, request.payload);
}

export function setLabel(address: Address, label: string) {
    const request: WebviewMessageRequest = {
        command: WebviewMessageId.setLabel,
        payload: {
            address,
            label
        }
    };
    messageHandler.send(request.command, request.payload);
}

export async function requestLabel(address: Address) {
    const label = await getInputFromTopBar('', 'New Label');
    if (!label || label.value === undefined) {
        return;
    }
    const request: WebviewMessageRequest = {
        command: WebviewMessageId.setLabel,
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
        command: WebviewMessageId.navigate,
        payload: { path, startOffset, endOffset }
    };
    messageHandler.send(request.command, request.payload);
}

export async function openExternal(url: string) {
    const request: WebviewMessageRequest = {
        command: WebviewMessageId.openExternal,
        payload: {
            path: url
        }
    };
    messageHandler.send(request.command, request.payload);
}

export async function openSettings(settingsUrl: string) {
    const request: WebviewMessageRequest = {
        command: WebviewMessageId.openSettings,
        payload: settingsUrl
    };
    messageHandler.send(request.command, request.payload);
}

export async function getBytecode(contractFqn: string): Promise<GetBytecodeResponse> {
    const request: WebviewMessageRequest = {
        command: WebviewMessageId.getBytecode,
        payload: {
            contractFqn
        }
    };
    return await messageHandler.request<GetBytecodeResponse>(request.command, request.payload);
}

// export async function requestNewProvider() {
//     const request: WebviewMessageRequest = {
//         command: WebviewMessageId.requestNewProvider,
//         payload: undefined
//     };
//     messageHandler.send(request.command, request.payload);
// }

export async function selectChain(chainId: string) {
    const request: WebviewMessageRequest = {
        command: WebviewMessageId.selectChain,
        payload: undefined
    };
    messageHandler.send(request.command, request.payload);
}

export async function restartWakeServer(): Promise<boolean> {
    const request: WebviewMessageRequest = {
        command: WebviewMessageId.restartWakeServer,
        payload: undefined
    };
    // TODO this can be send, does not neet to be a request
    return await messageHandler.request<boolean>(request.command, request.payload);
}

export function openChainsQuickPick() {
    const request: WebviewMessageRequest = {
        command: WebviewMessageId.openChainsQuickPick,
        payload: undefined
    };
    messageHandler.send(request.command, request.payload);
}

export function openAddAbiQuickPick(contractFqn: string) {
    const request: WebviewMessageRequest = {
        command: WebviewMessageId.openAddAbiQuickPick,
        payload: {
            contractFqn
        }
    };
    messageHandler.send(request.command, request.payload);
}

export function removeProxy(contractFqn: string, proxyAddress?: Address) {
    const request: WebviewMessageRequest = {
        command: WebviewMessageId.removeProxy,
        payload: {
            contractFqn,
            proxyAddress
        }
    };
    messageHandler.send(request.command, request.payload);
}

export function requestAddDeployedContract() {
    const request: WebviewMessageRequest = {
        command: WebviewMessageId.requestAddDeployedContract,
        payload: undefined
    };
    messageHandler.send(request.command, request.payload);
}

export async function reconnectChain(): Promise<boolean> {
    const request: WebviewMessageRequest = {
        command: WebviewMessageId.reconnectChain,
        payload: undefined
    };
    return await messageHandler.request<boolean>(request.command, request.payload);
}

export async function createNewLocalChain(
    displayName: string,
    networkCreationConfig?: NetworkCreationConfiguration
) {
    const request: WebviewMessageRequest = {
        command: WebviewMessageId.createNewLocalChain,
        payload: {
            displayName,
            networkCreationConfig
        }
    };
    return await messageHandler.request<boolean>(request.command, request.payload);
}

export async function connectToLocalChain(displayName: string, uri: string) {
    const request: WebviewMessageRequest = {
        command: WebviewMessageId.connectToLocalChain,
        payload: {
            displayName,
            uri
        }
    };
    return await messageHandler.request<boolean>(request.command, request.payload);
}
