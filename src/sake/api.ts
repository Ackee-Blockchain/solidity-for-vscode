import * as vscode from 'vscode';
import { AccountStateData, DeploymentStateData, WakeDeploymentRequestParams, WakeDeploymentResponse } from "./webview/shared/types";
import { LanguageClient } from 'vscode-languageclient/node';
import { CompilationState } from './state/CompilationState';
import { parseCompilationResult } from './utils/compilation';
import { DeploymentState } from './state/DeploymentState';
import { AccountState } from './state/AccountState';

const accountState = AccountState.getInstance();
const deploymentState = DeploymentState.getInstance();
const compilationState = CompilationState.getInstance();

export async function getAccounts(
    client: LanguageClient | undefined,
    outputChannel: vscode.OutputChannel) {
    if (client === undefined) {
        outputChannel.appendLine("Failed to get accounts due to missing language client");
        return;
    }

    const accountsResult = await client?.sendRequest<AccountStateData>("wake/sake/getAccounts");

    console.log("accounts result", accountsResult);

    if (accountsResult == null || accountsResult.length === 0) {
        vscode.window.showErrorMessage("Failed to get accounts!");
        return false;
    }

    console.log("saving acc state", accountsResult, accountState);

    accountState.setAccounts(accountsResult);

    console.log("saved acc state", accountState);

    return true;
}

export async function compile(
    client: LanguageClient | undefined,
    outputChannel: vscode.OutputChannel) {
    if (client === undefined) {
        outputChannel.appendLine("Failed to compile due to missing language client");
        return;
    }

    const compilationResult = await client?.sendRequest<any>("wake/sake/compile");

    if (compilationResult == null || !compilationResult.success) {
        vscode.window.showErrorMessage("Compilation failed!");
        return false;
    }

    vscode.window.showInformationMessage("Compilation was successful!");
    const _parsedCompilationResult = parseCompilationResult(compilationResult.contracts);
    compilationState.setCompilation(_parsedCompilationResult);

    return compilationResult.success;
}

export async function deploy(
    deploymentParams: WakeDeploymentRequestParams,
    client: LanguageClient | undefined,
    outputChannel: vscode.OutputChannel) {
    if (client === undefined) {
        outputChannel.appendLine("Failed to deploy due to missing language client");
        return;
    }

    // const deploymentResult = await client?.sendRequest<WakeDeployResult>("wake/sake/deploy");
    const deploymentResult = await client?.sendRequest<WakeDeploymentResponse>("wake/sake/deploy", deploymentParams);

    console.log("deployment result", deploymentResult);

    if (deploymentResult == null) { // TODO more checks
        vscode.window.showErrorMessage("Deployment failed!");
        return false;
    }

    vscode.window.showInformationMessage("Deployment was successful!");

    // Add deployment to state
    const _contractCompilationData = compilationState.getDict()[deploymentParams.contract_fqn];
    const _deploymentData: DeploymentStateData = {
        name: _contractCompilationData.name,
        address: deploymentResult.contractAddress,
        abi: _contractCompilationData.abi,
    }
    deploymentState.deploy(_deploymentData);

    // Show output
    outputChannel.appendLine("Deployed contract: " + _contractCompilationData.name);
    outputChannel.append(JSON.stringify(deploymentResult));
    outputChannel.show();

    return true;
}