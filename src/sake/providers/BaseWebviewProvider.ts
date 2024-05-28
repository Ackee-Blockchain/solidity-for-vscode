import * as vscode from "vscode";
import { getNonce } from "../utils/getNonce";
import { getBasePage } from "../utils/getBasePage";
import { MessageHandlerData } from '@estruyf/vscode';
import { BaseState } from "../state/BaseState";
import { DeployedContractsState } from "../state/DeployedContractsState";
import { loadSampleAbi } from "../commands";
import { StateId, WebviewMessageData, WebviewMessage, CompilationPayload } from "../webview/shared/types";

export abstract class BaseWebviewProvider implements vscode.WebviewViewProvider {
    _view?: vscode.WebviewView;
    _doc?: vscode.TextDocument;
    _stateSubscriptions: Map<StateId, any> = new Map(); // TODO add type

    constructor(private readonly _extensionUri: vscode.Uri, private readonly _targetPath: string) {}

    public resolveWebviewView(webviewView: vscode.WebviewView) {
        this._view = webviewView;

        // Set the webview's initial options
        webviewView.webview.options = {
            enableScripts: true, // Allow scripts in the webview
            localResourceRoots: [this._extensionUri],
        };

        // Set the webview's initial html content
        webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);

        // Subscribe to states
        DeployedContractsState.getInstance().subscribe(this);

        // Handle messages from the webview
        webviewView.webview.onDidReceiveMessage(async (message) => {
            await this._handleMessage(message, webviewView);
        });
    }

    public revive(panel: vscode.WebviewView) {
        this._view = panel;
    }

    private _getHtmlForWebview(webview: vscode.Webview) {
        const _sakePath = vscode.Uri.joinPath(
            this._extensionUri,
            "src",
            "sake",
        );

        const stylesResetUri = webview.asWebviewUri(vscode.Uri.joinPath(
            _sakePath,
            "media",
            "reset.css"
        ));

        const stylesMainUri = webview.asWebviewUri(vscode.Uri.joinPath(
            _sakePath,
            "media",
            "vscode.css"
        ));

        const webviewScriptUri = webview.asWebviewUri(vscode.Uri.joinPath(
            _sakePath,
            "webview",
            "dist",
            this._targetPath,
            "webview.js"
        ));

        const webviewStylesUri = webview.asWebviewUri(vscode.Uri.joinPath(
            _sakePath,
            "webview",
            "dist",
            this._targetPath,
            "bundle.css"
        ));

        // Use a nonce to only allow a specific script to be run.
        return getBasePage(
            [stylesResetUri, stylesMainUri, webviewStylesUri],
            [webviewScriptUri],
            getNonce(),
            webview.cspSource
        );
    }

    public postMessageToWebview(message: WebviewMessageData) {
        this._view?.webview.postMessage(message);
    }

    public setSubscribedState(subscribedState: BaseState<any>) {
        this._stateSubscriptions.set(subscribedState.stateId, subscribedState);
    }

    protected _setState(stateId: StateId, state: any) {
        const subscribedState = this._stateSubscriptions.get(stateId);
        subscribedState && (subscribedState.state = state);
    }

    protected _getState(stateId: StateId) {
        const subscribedState = this._stateSubscriptions.get(stateId);
        return subscribedState?.state;
    }

    protected _getStateObject(stateId: StateId) {
        return this._stateSubscriptions.get(stateId);
    }

    protected _getDeployedContracts(): DeployedContractsState {
        return this._getStateObject(StateId.DeployedContracts);
    }

    private async _handleMessage(message: WebviewMessageData, webviewView: vscode.WebviewView) {
        const { command, requestId, stateId, payload } = message;

        // convert stateId string to enum
        const _stateId = stateId as StateId;

        console.log("handling message", message);

        switch (command) {
            // TODO: change strings to enums
            case "onInfo": {
                if (!payload) {
                    return;
                }
                vscode.window.showInformationMessage(payload);
                break;
            }

            case "onError": {
                if (!payload) {
                    return;
                }
                vscode.window.showErrorMessage(payload);
                break;
            }

            case "getTextFromInputBox": {
                const value = await vscode.window.showInputBox({ value: payload });
                webviewView.webview.postMessage({ command, requestId, payload: value } as MessageHandlerData<string>);
                break;
            }

            case "setState": {
                if (!stateId || !this._stateSubscriptions.has(_stateId)) {
                    // console.error(`A provider ${this._targetPath} tried to set state which it does not subscribe to: ${stateId}`);
                    // Send a response to the webview that the state was not set
                    webviewView.webview.postMessage({ command, requestId, payload: false } as MessageHandlerData<boolean>);
                    break;
                }

                const state = this._stateSubscriptions.get(_stateId)
                state && (state.state = payload);

                // Send a response to the webview that the state was set
                webviewView.webview.postMessage({ command, requestId, payload: true } as MessageHandlerData<boolean>);

                break;
            }

            case "getState": {
                if (!stateId || !this._stateSubscriptions.has(_stateId)) {
                    // console.error(`A provider ${this._targetPath} tried to get state which it does not subscribe to: ${stateId}`);
                    webviewView.webview.postMessage({ command, requestId, payload: undefined } as MessageHandlerData<any>);
                    break;
                }

                const state = this._stateSubscriptions.get(_stateId)
                webviewView.webview.postMessage({ command, requestId, payload: state?.state } as MessageHandlerData<any>);
                break;
            }

            case "getSampleContractAbi": {
                const sampleContractAbi = await loadSampleAbi();
                webviewView.webview.postMessage({ command, requestId, payload: sampleContractAbi } as MessageHandlerData<string>);
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

            case "onContractFunctionCall": {
                if (!payload) {
                    return;
                }

                console.log("contract call was executed", payload);
            }

            case WebviewMessage.onCompileAll: {
                const compilation = await vscode.commands.executeCommand<CompilationPayload>("Tools-for-Solidity.sake.compile_all");
                console.log("compilation", compilation);

                console.log(vscode.window);

                if (!compilation.success) {
                    console.log("compilation failed");

                    await vscode.window.showErrorMessage("Compilation failed");
                    return;
                }

                console.log("compilation successful", vscode.window.showInformationMessage, vscode.window);
                const infores = await vscode.window.showInformationMessage("Compilation successful", "ok", "no");
                console.log("infores", infores);
                break;
            }

            default: {
                // Pass the message to the inheriting class
                this._onDidReceiveMessage(message);
            }
        }
    }
    /*
    * This method is called when the webview receives a message from the extension
    */
    protected async _onDidReceiveMessage(message: WebviewMessageData) {}
}