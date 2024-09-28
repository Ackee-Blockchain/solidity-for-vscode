import { messageHandler } from '@estruyf/vscode/dist/client';
import {
    WebviewMessage,
    type DeploymentState,
    type CallRequest,
    type WakeDeploymentRequestParams,
    type WakeSetBalancesRequestParams,
    type CompiledContract,
    type WalletDeploymentData,
    type Bytecode,
    type WakeGetBytecodeResponse
} from '../../shared/types';
import { deployedContracts } from './store';

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

export function functionCall(payload: CallRequest) {
    messageHandler.send(WebviewMessage.onContractFunctionCall, payload);
}

export function deployContract(
    contractFqn: string,
    sender: string,
    calldata: string,
    value: number = 0
) {
    const _pamars: WakeDeploymentRequestParams = {
        contractFqn: contractFqn,
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

export async function getInputFromTopBar(
    value: string = '',
    title: string | undefined = undefined
) {
    return await messageHandler.request<string>(WebviewMessage.getTextFromInputBox, {
        value: value,
        title: title
    });
}

export async function compileContracts(): Promise<boolean> {
    return await messageHandler.request<boolean>(WebviewMessage.onCompile);
}

export async function removeContract(contract: DeploymentState) {
    return await messageHandler.request<boolean>(WebviewMessage.onUndeployContract, contract);
    // deployedContracts.update((state) => {
    //     return state.filter((c) => c.address !== contract.address);
    // });
}

export async function setLabel(contract: DeploymentState) {
    return await messageHandler.request<boolean>(WebviewMessage.onsetLabel, contract);
}

export async function navigateTo(
    path: string,
    startOffset: number | undefined,
    endOffset: number | undefined
) {
    messageHandler.send(WebviewMessage.onNavigate, { path, startOffset, endOffset });
}

export async function openExternal(url: string) {
    messageHandler.send(WebviewMessage.onOpenExternal, { path: url });
}

export async function getBytecode(contractFqn: string): Promise<WakeGetBytecodeResponse> {
    return await messageHandler.request<WakeGetBytecodeResponse>(WebviewMessage.onGetBytecode, {
        contractFqn
    });
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
    } as WalletDeploymentData;

    console.log('openDeploymentInBrowser params', _params);

    messageHandler.send(WebviewMessage.onOpenDeploymentInBrowser, _params);
}
