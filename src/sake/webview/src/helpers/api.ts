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
    return await messageHandler.request<string | undefined>(request.command, request.payload);
}

export async function compileContracts() {
    const request: WebviewMessageRequest = {
        command: WebviewMessageId.onCompile,
        payload: undefined
    };
    messageHandler.request(request.command, request.payload);
}

export async function removeDeployedContract(address: Address) {
    const request: WebviewMessageRequest = {
        command: WebviewMessageId.onUndeployContract,
        payload: address
    };
    messageHandler.send(request.command, request.payload);
}

export function setLabel(address: Address, nickname: string) {
    const request: WebviewMessageRequest = {
        command: WebviewMessageId.onSetLabel,
        payload: {
            address,
            nickname
        }
    };
    messageHandler.send(request.command, request.payload);
}

export async function requestLabel(address: Address) {
    const nickname = await getInputFromTopBar('', 'New Label');
    if (!nickname) {
        return;
    }
    const request: WebviewMessageRequest = {
        command: WebviewMessageId.onSetLabel,
        payload: {
            address,
            nickname
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

export async function getBytecode(contractFqn: string): Promise<GetBytecodeResponse> {
    const request: WebviewMessageRequest = {
        command: WebviewMessageId.onGetBytecode,
        payload: {
            contractFqn
        }
    };
    return await messageHandler.request<GetBytecodeResponse>(request.command, request.payload);
}

export async function requestNewChain() {
    const request: WebviewMessageRequest = {
        command: WebviewMessageId.onRequestNewChain,
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

export async function openDeploymentInBrowser(
    contract: CompiledContract,
    calldata: string,
    value: number
) {
    const { success, bytecode } = await getBytecode(contract.fqn);

    if (!success) {
        return;
    }

    if (!bytecode) {
        console.error('No bytecode found');
        return;
    }

    const _params = {
        name: contract.name,
        abi: contract.abi,
        bytecode: bytecode,
        calldata: calldata,
        value: value
    };
    // } as WalletDeploymentData; TODO: fix this

    console.log('openDeploymentInBrowser params', _params);

    messageHandler.send(WebviewMessageId.onOpenDeploymentInBrowser, _params);
}
