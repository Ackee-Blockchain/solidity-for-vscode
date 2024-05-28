import * as vscode from "vscode";
import { BaseWebviewProvider } from "./BaseWebviewProvider";
import { loadSampleAbi } from "../commands";
import { MessageHandlerData } from "@estruyf/vscode";
import { WebviewMessage } from "../webview/shared/types";

export class CompilerWebviewProvider extends BaseWebviewProvider {
    constructor(_extensionUri: vscode.Uri) {
        super(_extensionUri, "compiler");
    }
}

export class DeployWebviewProvider extends BaseWebviewProvider {
    constructor(_extensionUri: vscode.Uri) {
        super(_extensionUri, "deploy");
    }

    protected override async _onDidReceiveMessage(message: WebviewMessage) {
        const { command, requestId, stateId, payload } = message;

        switch (command) {
            case "getSampleContractAbi": {
                const sampleContractAbi = await loadSampleAbi();
                this._view?.webview.postMessage({ command, requestId, payload: sampleContractAbi } as MessageHandlerData<string>);
                break;
            }

            case "deployContract": {
                if (!payload) {
                    return;
                }

                this._getDeployedContracts().deploy(payload);

                break;
            }

            case "undeployContract": {
                if (!payload) {
                    return;
                }

                this._getDeployedContracts().undeploy(payload);

                break;
            }
        }

    }
}

export class RunWebviewProvider extends BaseWebviewProvider {
    constructor(_extensionUri: vscode.Uri) {
        super(_extensionUri, "run");
    }
}