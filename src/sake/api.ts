import * as vscode from 'vscode';
import {
    AccountStateData,
    Address,
    DeploymentStateData,
    CallPayload,
    TxDecodedReturnValue,
    TxDeploymentOutput,
    TxCallOutput,
    TxOutput,
    TxType,
    WakeCompilationResponse,
    WakeDeploymentRequestParams,
    WakeDeploymentResponse,
    WakeCallRequestParams,
    WakeCallResponse,
    WakeGetBalancesRequestParams,
    WakeGetBalancesResponse,
    WakeSetBalancesRequestParams,
    WakeSetBalancesResponse,
    CallType,
    ContractFunction,
    WakeSetLabelRequestParams
} from './webview/shared/types';
import { LanguageClient } from 'vscode-languageclient/node';
import { CompilationState } from './state/CompilationState';
import { getNameFromContractFqn, parseCompilationResult } from './utils/compilation';
import { DeploymentState } from './state/DeploymentState';
import { AccountState } from './state/AccountState';
import { decodeCallReturnValue } from './utils/call';
import { OutputViewManager, SakeOutputTreeProvider } from './providers/OutputTreeProvider';
import { TxHistoryState } from './state/TxHistoryState';
import { validate } from './utils/validate';

const accountState = AccountState.getInstance();
const deploymentState = DeploymentState.getInstance();
const compilationState = CompilationState.getInstance();
const txHistoryState = TxHistoryState.getInstance();

/**
 * Get accounts and balances and save to state
 *
 * @param client
 * @returns boolean based on success
 */
export async function getAccounts(client: LanguageClient | undefined) {
    try {
        if (client === undefined) {
            throw new Error('Missing language client');
        }

        let result = await client?.sendRequest<Address[]>('wake/sake/getAccounts');

        result = validate(result);

        if (result == null) {
            throw new Error('No result returned');
        }
        if (result.length === 0) {
            throw new Error('No accounts returned');
        }

        // @dev set the state here also, even though it will be updated in getBalances
        // this is because balances only update existing accounts state
        const _accountStateData = result.map((address, i) => {
            return {
                address: address,
                balance: null,
                nick: `Account ${i}`
            } as AccountStateData;
        });

        accountState.setAccountsSilent(_accountStateData);

        getBalances({ addresses: result }, client);

        return true;
    } catch (e) {
        const message = typeof e === 'string' ? e : (e as Error).message;
        vscode.window.showErrorMessage('Failed to get accounts: ' + message);
        return false;
    }
}

/**
 * Get balances for a list of addresses and save to state
 * @dev only updates existing accounts state
 *
 * @param requestParams - list of addresses
 * @param client - language client
 * @returns boolean based on success
 */
export async function getBalances(
    requestParams: WakeGetBalancesRequestParams,
    client: LanguageClient | undefined
) {
    try {
        if (client === undefined) {
            throw new Error('Missing language client');
        }

        let result = await client?.sendRequest<WakeGetBalancesResponse>(
            'wake/sake/getBalances',
            requestParams
        );

        if (result == null) {
            throw new Error('No result returned');
        }
        if (!result.success) {
            throw new Error('Failed to get balances');
        }

        // const _accountStateData = requestParams.addresses.map((address) => {
        //     return {
        //         address: address,
        //         balance: result.balances[address]
        //     };
        // });
        // accountState.setAccounts(_accountStateData);

        accountState.updateBalances(result.balances);

        return true;
    } catch (e) {
        const message = typeof e === 'string' ? e : (e as Error).message;
        vscode.window.showErrorMessage('Failed to get addresses: ' + message);
        return false;
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

        let result = await client?.sendRequest<WakeSetBalancesResponse>(
            'wake/sake/setBalances',
            requestParams
        );

        result = validate(result);

        if (result == null) {
            throw new Error('No result returned');
        }
        if (!result.success) {
            throw new Error('Failed to set balances');
        }

        // Update balances
        accountState.updateBalances(requestParams.balances);
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

        let result = await client?.sendRequest<WakeCompilationResponse>('wake/sake/compile');

        console.log(result);

        if (result == null) {
            throw new Error('No result returned');
        }
        if (!result.success) {
            throw new Error('Compilation was unsuccessful');
        }

        // vscode.window.showInformationMessage('Compilation was successful!');
        const _parsedResult = parseCompilationResult(result.contracts);
        compilationState.setCompilation(_parsedResult);

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
    output: OutputViewManager
) {
    try {
        if (client === undefined) {
            throw new Error('Missing language client');
        }

        let result = await client?.sendRequest<WakeDeploymentResponse>(
            'wake/sake/deploy',
            requestParams
        );

        result = validate(result);

        if (result == null) {
            throw new Error('No result returned');
        }
        // if (!result.success) { throw new Error("Deployment was unsuccessful"); }

        let _contractCompilationData;
        if (result.success) {
            _contractCompilationData = compilationState.getContract(requestParams.contractFqn);
            if (_contractCompilationData == null) {
                throw new Error(
                    'Contract compilation data not found for fqn: ' + requestParams.contractFqn
                );
            }
            const _deploymentData: DeploymentStateData = {
                name: _contractCompilationData.name,
                address: result.contractAddress!,
                abi: _contractCompilationData.abi,
                balance: null,
                nick: null
            };

            deploymentState.deploy(_deploymentData);

            // update calldata
        }

        // Add to tx history
        const txOutput: TxDeploymentOutput = {
            type: TxType.Deployment,
            success: true, // TODO success will show true even on revert
            from: requestParams.sender,
            contractAddress: result.contractAddress,
            contractName: getNameFromContractFqn(requestParams.contractFqn),
            receipt: result.txReceipt,
            callTrace: result.callTrace
        };

        txHistoryState.addTx(txOutput);
        output.set(txOutput);
        vscode.commands.executeCommand('sake-output.focus');

        // vscode.window.showInformationMessage('Deployment was successful!');

        return true;
    } catch (e) {
        const message = typeof e === 'string' ? e : (e as Error).message;
        vscode.window.showErrorMessage('Deployment failed with error: ' + message);
        return false;
    }
}

export async function call(
    callPayload: CallPayload,
    client: LanguageClient | undefined,
    output: OutputViewManager
) {
    const { requestParams, func } = callPayload;

    const callType = specifyCallType(func);

    try {
        if (client === undefined) {
            throw new Error('Missing language client');
        }

        // TODO fix when fixed in wake
        // const apiEndpoint =
        //     callType === CallType.Transact ? 'wake/sake/transact' : 'wake/sake/call';
        const apiEndpoint = 'wake/sake/transact';
        let result = await client?.sendRequest<WakeCallResponse>(apiEndpoint, requestParams);

        result = validate(result);

        if (result == null) {
            throw new Error('No result returned');
        }
        // if (!result.success) { throw new Error("Function call was unsuccessful"); }

        let decodedReturnValue: TxDecodedReturnValue[] | undefined = undefined;
        if (result.success) {
            // parse result
            try {
                decodedReturnValue = decodeCallReturnValue(result.returnValue, func);
            } catch (e) {
                vscode.window.showErrorMessage('Failed to decode return value: ' + e);
            }
        }

        const txOutput: TxCallOutput = {
            callType: callType,
            type: TxType.FunctionCall,
            success: result.success, // TODO success will show true even on revert
            from: requestParams.sender,
            to: requestParams.contractAddress,
            functionName: func.name,
            returnData: {
                bytes: result.returnValue,
                decoded: decodedReturnValue
            },
            receipt: result.txReceipt,
            callTrace: result.callTrace
        };

        txHistoryState.addTx(txOutput);
        output.set(txOutput);
        vscode.commands.executeCommand('sake-output.focus');

        // vscode.window.showInformationMessage("Function call was successful!");

        return true;
    } catch (e) {
        const message = typeof e === 'string' ? e : (e as Error).message;
        vscode.window.showErrorMessage(
            'Function call failed with error received from LSP server: ' + message
        );
        return false;
    }
}

export async function setLabel(
    requestParams: WakeSetLabelRequestParams,
    client: LanguageClient | undefined
) {
    try {
        if (client === undefined) {
            throw new Error('Missing language client');
        }

        client?.sendRequest<WakeSetBalancesResponse>('wake/sake/setLabel', requestParams);
    } catch (e) {
        const message = typeof e === 'string' ? e : (e as Error).message;
        vscode.window.showErrorMessage('Failed to set balances: ' + message);
        return false;
    }
}

function specifyCallType(func: ContractFunction): CallType {
    return func.stateMutability === 'view' || func.stateMutability === 'pure'
        ? CallType.Call
        : CallType.Transact;
}
