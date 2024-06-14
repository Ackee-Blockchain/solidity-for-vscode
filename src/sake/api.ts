import * as vscode from 'vscode';
import { AccountStateData, DeploymentStateData, FunctionCallPayload, TxDeploymentOutput, TxFunctionCallOutput, TxOutput, TxType, WakeDeploymentRequestParams, WakeDeploymentResponse, WakeFunctionCallRequestParams, WakeFunctionCallResponse } from "./webview/shared/types";
import { LanguageClient } from 'vscode-languageclient/node';
import { CompilationState } from './state/CompilationState';
import { parseCompilationResult } from './utils/compilation';
import { DeploymentState } from './state/DeploymentState';
import { AccountState } from './state/AccountState';
import { decodeCallReturnValue } from './utils/call';
import { SakeOutputTreeProvider } from './providers/OutputTreeProvider';
import { TxHistoryState } from './state/TxHistoryState';

const accountState = AccountState.getInstance();
const deploymentState = DeploymentState.getInstance();
const compilationState = CompilationState.getInstance();
const txHistoryState = TxHistoryState.getInstance();

export async function getAccounts(
    client: LanguageClient | undefined) {
    try {
        if (client === undefined) { throw new Error("Missing language client"); }

        const accountsResult = await client?.sendRequest<AccountStateData>("wake/sake/getAccounts");

        if (accountsResult == null) { throw new Error("No result returned"); }
        if (accountsResult.length === 0) { throw new Error("No accounts returned"); }

        accountState.setAccounts(accountsResult);

        return true;
    } catch (e) {
        const message = typeof e === "string" ? e : (e as Error).message;
        vscode.window.showErrorMessage("Failed to get accounts: " + message);
        return false;
    }
}

export async function compile(
    client: LanguageClient | undefined) {
    try {
        if (client === undefined) { throw new Error("Missing language client"); }

        const compilationResult = await client?.sendRequest<any>("wake/sake/compile");

        if (compilationResult == null) { throw new Error("No result returned"); }
        if (!compilationResult.success) { throw new Error("Compilation was unsuccessful"); }

        vscode.window.showInformationMessage("Compilation was successful!");
        const _parsedCompilationResult = parseCompilationResult(compilationResult.contracts);
        compilationState.setCompilation(_parsedCompilationResult);

        return compilationResult.success;
    } catch (e) {
        const message = typeof e === "string" ? e : (e as Error).message;
        vscode.window.showErrorMessage("Compilation failed with error: " + message);
        return false;
    }
}

export async function deploy(
    requestParams: WakeDeploymentRequestParams,
    client: LanguageClient | undefined,
    outputTreeProvider: SakeOutputTreeProvider) {
    try {
        if (client === undefined) { throw new Error("Missing language client"); }

        console.log("deployment params", requestParams);

        const result = await client?.sendRequest<WakeDeploymentResponse>("wake/sake/deploy", requestParams);

        console.log("deployment result", result);

        if (result == null) { throw new Error("No result returned"); }
        if (!result.success) { throw new Error("Deployment was unsuccessful"); }

        // Add deployment to state
        const _contractCompilationData = compilationState.getDict()[requestParams.contract_fqn];
        const _deploymentData: DeploymentStateData = {
            name: _contractCompilationData.name,
            address: result.contractAddress!,
            abi: _contractCompilationData.abi,
        };

        deploymentState.deploy(_deploymentData);

        // Add to tx history
        const txOutput: TxDeploymentOutput = {
            type: TxType.Deployment,
            success: true,  // TODO success will show true even on revert
            from: requestParams.sender,
            contractAddress: result.contractAddress!,
            contractName: _contractCompilationData.name,
            receipt: result.txReceipt,
            callTrace: result.callTrace
        };

        txHistoryState.addTx(txOutput);
        outputTreeProvider.set(txOutput);
        vscode.commands.executeCommand("sake-output.focus");

        vscode.window.showInformationMessage("Deployment was successful!");

        return true;
    } catch (e) {
        const message = typeof e === "string" ? e : (e as Error).message;
        vscode.window.showErrorMessage("Deployment failed with error: " + message);
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
        if (client === undefined) { throw new Error("Missing language client"); }

        console.log("call params", requestParams);

        const result = await client?.sendRequest<WakeFunctionCallResponse>("wake/sake/call", requestParams);

        console.log("call result", result);

        if (result == null) { throw new Error("No result returned"); }
        if (!result.success) { throw new Error("Function call was unsuccessful"); }

        // parse
        const decocedReturnValue = decodeCallReturnValue(result.returnValue, func);
        console.log("decoded return value", decocedReturnValue);

        const txOutput: TxFunctionCallOutput = {
            type: TxType.FunctionCall,
            success: true, // TODO success will show true even on revert
            from: requestParams.sender,
            to: requestParams.contract_address,
            functionName: func.name,
            returnValue: decocedReturnValue,
            receipt: result.txReceipt,
            callTrace: result.callTrace
        };

        txHistoryState.addTx(txOutput);
        outputTreeProvider.set(txOutput);
        vscode.commands.executeCommand("sake-output.focus");

        vscode.window.showInformationMessage("Function call was successful!");

        return true;
    } catch (e) {
        const message = typeof e === "string" ? e : (e as Error).message;
        vscode.window.showErrorMessage("Function call failed with error: " + message);
        return false;
    }
}