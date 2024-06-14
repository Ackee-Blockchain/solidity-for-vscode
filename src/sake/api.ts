import * as vscode from 'vscode';
import { AccountStateData, DeploymentStateData, FunctionCallPayload, WakeDeploymentRequestParams, WakeDeploymentResponse, WakeFunctionCallRequestParams } from "./webview/shared/types";
import { LanguageClient } from 'vscode-languageclient/node';
import { CompilationState } from './state/CompilationState';
import { parseCompilationResult } from './utils/compilation';
import { DeploymentState } from './state/DeploymentState';
import { AccountState } from './state/AccountState';
import { decodeCallReturnValue } from './utils/call';

const accountState = AccountState.getInstance();
const deploymentState = DeploymentState.getInstance();
const compilationState = CompilationState.getInstance();

export async function getAccounts(
    client: LanguageClient | undefined,
    outputChannel: vscode.OutputChannel) {
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
    client: LanguageClient | undefined,
    outputChannel: vscode.OutputChannel) {
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
    deploymentParams: WakeDeploymentRequestParams,
    client: LanguageClient | undefined,
    outputChannel: vscode.OutputChannel) {
    try {
        if (client === undefined) { throw new Error("Missing language client"); }

        console.log("deployment params", deploymentParams);

        const deploymentResult = await client?.sendRequest<WakeDeploymentResponse>("wake/sake/deploy", deploymentParams);

        if (deploymentResult == null) { throw new Error("No result returned"); }
        if (!deploymentResult.success) { throw new Error("Deployment was unsuccessful"); }

        // Add deployment to state
        const _contractCompilationData = compilationState.getDict()[deploymentParams.contract_fqn];
        const _deploymentData: DeploymentStateData = {
            name: _contractCompilationData.name,
            address: deploymentResult.contractAddress!,
            abi: _contractCompilationData.abi,
        };

        console.log("deployment data", _deploymentData, deploymentResult)

        deploymentState.deploy(_deploymentData);

        // Show output
        outputChannel.appendLine("Deployed contract: " + _contractCompilationData.name);
        outputChannel.append(JSON.stringify(deploymentResult.txReceipt));
        outputChannel.show();
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
    outputChannel: vscode.OutputChannel) {
    const { requestParams, func } = callPayload;

    try {
        if (client === undefined) { throw new Error("Missing language client"); }

        console.log("call params", requestParams);

        const callResult = await client?.sendRequest<any>("wake/sake/call", requestParams);

        console.log("call result", callResult);

        if (callResult == null) { throw new Error("No result returned"); }
        if (!callResult.success) { throw new Error("Function call was unsuccessful"); }

        // parse
        const decocedReturnValue = decodeCallReturnValue(callResult.returnValue, func);
        console.log("decoded return value", decocedReturnValue);

        // Show output
        outputChannel.appendLine("Function call was successful!");
        outputChannel.append(JSON.stringify(callResult.txReceipt));
        outputChannel.show();
        vscode.window.showInformationMessage("Function call was successful!");

        return true;
    } catch (e) {
        const message = typeof e === "string" ? e : (e as Error).message;
        vscode.window.showErrorMessage("Function call failed with error: " + message);
        return false;
    }
}