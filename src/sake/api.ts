import * as vscode from 'vscode';
import {
    AccountStateData,
    Address,
    DeploymentStateData,
    FunctionCallPayload,
    TxDeploymentOutput,
    TxFunctionCallOutput,
    TxOutput,
    TxType,
    WakeDeploymentRequestParams,
    WakeDeploymentResponse,
    WakeFunctionCallRequestParams,
    WakeFunctionCallResponse,
    WakeGetBalancesRequestParams,
    WakeGetBalancesResponse,
    WakeSetBalancesRequestParams
} from './webview/shared/types';
import { LanguageClient } from 'vscode-languageclient/node';
import { CompilationState } from './state/CompilationState';
import { getNameFromContractFqn, parseCompilationResult } from './utils/compilation';
import { DeploymentState } from './state/DeploymentState';
import { AccountState } from './state/AccountState';
import { decodeCallReturnValue } from './utils/call';
import { SakeOutputTreeProvider } from './providers/OutputTreeProvider';
import { TxHistoryState } from './state/TxHistoryState';

const accountState = AccountState.getInstance();
const deploymentState = DeploymentState.getInstance();
const compilationState = CompilationState.getInstance();
const txHistoryState = TxHistoryState.getInstance();

export async function getAccounts(client: LanguageClient | undefined) {
    try {
        if (client === undefined) {
            throw new Error('Missing language client');
        }

        const result = await client?.sendRequest<Address[]>('wake/sake/getAccounts');

        if (result == null) {
            throw new Error('No result returned');
        }
        if (result.length === 0) {
            throw new Error('No accounts returned');
        }

        // @dev don't set the state here, as it will be set in balances

        // const _accountStateData = result.map((address) => {
        //     return {
        //         address: address,
        //         balance: undefined
        //     };
        // });
        // accountState.setAccounts(_accountStateData);

        getBalances({ addresses: result }, client);

        return true;
    } catch (e) {
        const message = typeof e === 'string' ? e : (e as Error).message;
        vscode.window.showErrorMessage('Failed to get accounts: ' + message);
        return false;
    }
}

export async function getBalances(
    requestParams: WakeGetBalancesRequestParams,
    client: LanguageClient | undefined
) {
    try {
        if (client === undefined) {
            throw new Error('Missing language client');
        }

        const result = await client?.sendRequest<WakeGetBalancesResponse>(
            'wake/sake/getBalances',
            requestParams
        );

        if (result == null) {
            throw new Error('No result returned');
        }
        if (!result.success) {
            throw new Error('Failed to get balances');
        }

        const _accountStateData = requestParams.addresses.map((address) => {
            return {
                address: address,
                balance: result.balances[address]
            };
        });

        accountState.setAccounts(_accountStateData);

        return result;
    } catch (e) {
        const message = typeof e === 'string' ? e : (e as Error).message;
        vscode.window.showErrorMessage('Failed to get addresses: ' + message);
        return [];
    }
}

export async function setBalances(
    requestParams: WakeSetBalancesRequestParams,
    client: LanguageClient | undefined
) {
    try {
        if (client === undefined) {
            throw new Error('Missing language client');
        }

        const result = await client?.sendRequest<boolean>('wake/sake/setBalances', requestParams);

        if (result == null) {
            throw new Error('No result returned');
        }
        if (!result) {
            throw new Error('Failed to set balances');
        }

        return result;
    } catch (e) {
        const message = typeof e === 'string' ? e : (e as Error).message;
        vscode.window.showErrorMessage('Failed to set balances: ' + message);
        return false;
    }
}

export async function compile(client: LanguageClient | undefined) {
    try {
        if (client === undefined) {
            throw new Error('Missing language client');
        }

        const result = await client?.sendRequest<any>('wake/sake/compile');

        if (result == null) {
            throw new Error('No result returned');
        }
        if (!result.success) {
            throw new Error('Compilation was unsuccessful');
        }

        vscode.window.showInformationMessage('Compilation was successful!');
        const _parsedresult = parseCompilationResult(result.contracts);
        compilationState.setCompilation(_parsedresult);

        return result.success;
    } catch (e) {
        const message = typeof e === 'string' ? e : (e as Error).message;
        vscode.window.showErrorMessage('Compilation failed with error: ' + message);
        return false;
    }
}

export async function deploy(
    requestParams: WakeDeploymentRequestParams,
    client: LanguageClient | undefined,
    outputTreeProvider: SakeOutputTreeProvider
) {
    try {
        if (client === undefined) {
            throw new Error('Missing language client');
        }

        console.log('deployment params', requestParams);

        const result = await client?.sendRequest<WakeDeploymentResponse>(
            'wake/sake/deploy',
            requestParams
        );

        console.log('deployment result', result);

        if (result == null) {
            throw new Error('No result returned');
        }
        // if (!result.success) { throw new Error("Deployment was unsuccessful"); }

        let _contractCompilationData;
        if (result.success) {
            _contractCompilationData = compilationState.getDict()[requestParams.contract_fqn];
            const _deploymentData: DeploymentStateData = {
                name: _contractCompilationData.name,
                address: result.contractAddress!,
                abi: _contractCompilationData.abi
            };

            deploymentState.deploy(_deploymentData);
        }

        // Add deployment to state

        // Add to tx history
        const txOutput: TxDeploymentOutput = {
            type: TxType.Deployment,
            success: true, // TODO success will show true even on revert
            from: requestParams.sender,
            contractAddress: result.contractAddress,
            contractName: getNameFromContractFqn(requestParams.contract_fqn),
            receipt: result.txReceipt,
            callTrace: result.callTrace
        };

        txHistoryState.addTx(txOutput);
        outputTreeProvider.set(txOutput);
        vscode.commands.executeCommand('sake-output.focus');

        vscode.window.showInformationMessage('Deployment was successful!');

        return true;
    } catch (e) {
        const message = typeof e === 'string' ? e : (e as Error).message;
        vscode.window.showErrorMessage('Deployment failed with error: ' + message);
        return false;
    }
}

export async function call(
    callPayload: FunctionCallPayload,
    client: LanguageClient | undefined,
    outputTreeProvider: SakeOutputTreeProvider
) {
    const { requestParams, func } = callPayload;

    try {
        if (client === undefined) {
            throw new Error('Missing language client');
        }

        console.log('call params', requestParams);

        const result = await client?.sendRequest<WakeFunctionCallResponse>(
            'wake/sake/call',
            requestParams
        );

        console.log('call result', result);

        if (result == null) {
            throw new Error('No result returned');
        }
        // if (!result.success) { throw new Error("Function call was unsuccessful"); }

        let decodedReturnValue;
        if (result.success) {
            // parse result
            decodedReturnValue = decodeCallReturnValue(result.returnValue, func);
            console.log('decoded return value', decodedReturnValue);
        }

        const txOutput: TxFunctionCallOutput = {
            type: TxType.FunctionCall,
            success: result.success, // TODO success will show true even on revert
            from: requestParams.sender,
            to: requestParams.contract_address,
            functionName: func.name,
            returnValue: decodedReturnValue,
            receipt: result.txReceipt,
            callTrace: result.callTrace
        };

        txHistoryState.addTx(txOutput);
        outputTreeProvider.set(txOutput);
        vscode.commands.executeCommand('sake-output.focus');

        // vscode.window.showInformationMessage("Function call was successful!");

        return true;
    } catch (e) {
        const message = typeof e === 'string' ? e : (e as Error).message;
        vscode.window.showErrorMessage('Function call failed with error: ' + message);
        return false;
    }
}
