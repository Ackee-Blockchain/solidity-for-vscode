import * as vscode from 'vscode';
import { getNonce } from '../utils/getNonce';
import { getBasePage } from '../utils/getBasePage';
import { MessageHandlerData } from '@estruyf/vscode';
import {
    copyToClipboard,
    getTextFromInputBox,
    navigateTo,
    openExternal,
    openSettings
} from '../commands';
import {
    StateId,
    WebviewMessageId,
    WakeGetBytecodeResponse,
    GetBytecodeResponse,
    WebviewMessageRequest,
    WebviewMessageResponse
} from '../webview/shared/types';
import { BaseStateProvider } from '../state/BaseStateProvider';
import { SakeProviderManager } from '../sake_providers/SakeProviderManager';
import { CompilationStateProvider } from '../state/CompilationStateProvider';
import { ChainStateProvider } from '../state/ChainStateProvider';
import { AppStateProvider } from '../state/AppStateProvider';
import { restartWakeClient } from '../../commands';
import { SakeContext } from '../context';

export abstract class BaseWebviewProvider implements vscode.WebviewViewProvider {
    _view?: vscode.WebviewView;
    _doc?: vscode.TextDocument;
    _stateSubscriptions: Map<StateId, BaseStateProvider<any>> = new Map();
    _sake: SakeProviderManager;

    constructor(private readonly _extensionUri: vscode.Uri, private readonly _targetPath: string) {
        this._sake = SakeProviderManager.getInstance();

        // Subscribe to shared state
        this._subscribeToSharedState();
    }

    private _subscribeToSharedState() {
        CompilationStateProvider.getInstance().subscribe(this);
        ChainStateProvider.getInstance().subscribe(this);
        AppStateProvider.getInstance().subscribe(this);
    }

    public resolveWebviewView(webviewView: vscode.WebviewView) {
        this._view = webviewView;

        // Set the webview's initial options
        webviewView.webview.options = {
            enableScripts: true, // Allow scripts in the webview
            localResourceRoots: [this._extensionUri]
        };

        // Set the webview's initial html content
        webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);

        // Handle messages from the webview
        webviewView.webview.onDidReceiveMessage(async (message) => {
            await this._handleMessage(message, webviewView);
        });
    }

    public revive(panel: vscode.WebviewView) {
        this._view = panel;
    }

    private _getHtmlForWebview(webview: vscode.Webview) {
        const _sakePath = vscode.Uri.joinPath(this._extensionUri, 'dist', 'sake');

        const stylesResetUri = webview.asWebviewUri(
            vscode.Uri.joinPath(_sakePath, 'media', 'reset.css')
        );

        const stylesMainUri = webview.asWebviewUri(
            vscode.Uri.joinPath(_sakePath, 'media', 'vscode.css')
        );

        const webviewScriptUri = webview.asWebviewUri(
            vscode.Uri.joinPath(_sakePath, 'webview', this._targetPath, 'webview.js')
        );

        const webviewStylesUri = webview.asWebviewUri(
            vscode.Uri.joinPath(_sakePath, 'webview', this._targetPath, 'bundle.css')
        );

        // Use a nonce to only allow a specific script to be run.
        return getBasePage(
            [stylesResetUri, stylesMainUri, webviewStylesUri],
            [webviewScriptUri],
            getNonce(),
            webview.cspSource
        );
    }

    public postMessageToWebview(message: any) {
        // TODO set type
        this._view?.webview.postMessage(message);
    }

    public setSubscribedState(subscribedState: BaseStateProvider<any>) {
        this._stateSubscriptions.set(subscribedState.stateId, subscribedState);
    }

    public unsetSubscribedState(subscribedState: BaseStateProvider<any>) {
        this._stateSubscriptions.delete(subscribedState.stateId);
    }

    private async _handleMessage(message: WebviewMessageRequest, webviewView: vscode.WebviewView) {
        switch (message.command) {
            case WebviewMessageId.requestState: {
                const state = this._stateSubscriptions.get(message.payload);

                state?.sendToWebview();

                webviewView.webview.postMessage({
                    command: message.command,
                    requestId: message.requestId,
                    payload: {
                        success: state !== undefined
                    }
                } as WebviewMessageResponse);

                break;
            }

            case WebviewMessageId.onInfo: {
                vscode.window.showInformationMessage(message.payload);
                break;
            }

            case WebviewMessageId.onError: {
                vscode.window.showErrorMessage(message.payload);
                break;
            }

            case WebviewMessageId.getTextFromInputBox: {
                const result = await getTextFromInputBox(
                    message.payload.title,
                    message.payload.value
                );

                webviewView.webview.postMessage({
                    command: message.command,
                    requestId: message.requestId,
                    payload: {
                        value: result
                    }
                } as WebviewMessageResponse);

                break;
            }

            case WebviewMessageId.copyToClipboard: {
                copyToClipboard(message.payload);
                break;
            }

            case WebviewMessageId.onUndeployContract: {
                this._sake.provider?.removeDeployedContract(message.payload);
                break;
            }

            case WebviewMessageId.onCompile: {
                await this._sake.provider?.compile();

                webviewView.webview.postMessage({
                    command: message.command,
                    requestId: message.requestId,
                    payload: {
                        success: true // TODO returns true always
                    }
                } as WebviewMessageResponse);

                break;
            }

            case WebviewMessageId.onDeploy: {
                this._sake.provider?.deployContract(message.payload);
                break;
            }

            case WebviewMessageId.onContractFunctionCall: {
                this._sake.provider?.callContract(message.payload);
                break;
            }

            case WebviewMessageId.onSetBalance: {
                this._sake.provider?.setAccountBalance(message.payload);
                break;
            }

            case WebviewMessageId.onSetLabel: {
                this._sake.provider?.setAccountLabel(message.payload);
                break;
            }

            case WebviewMessageId.onNavigate: {
                navigateTo(
                    message.payload.path,
                    message.payload.startOffset,
                    message.payload.endOffset
                );
                break;
            }

            case WebviewMessageId.onOpenExternal: {
                openExternal(message.payload.path);
                break;
            }

            case WebviewMessageId.onOpenDeploymentInBrowser: {
                // TODO
                if (!message.payload) {
                    console.error('No deployment params provided');
                    return;
                }

                const success = await vscode.commands.executeCommand<boolean>(
                    'Tools-for-Solidity.sake.openDeploymentInBrowser',
                    message.payload
                );

                webviewView.webview.postMessage({
                    command: message.command,
                    requestId: message.requestId,
                    payload: success
                } as MessageHandlerData<boolean>);

                break;
            }

            case WebviewMessageId.onGetBytecode: {
                const response: GetBytecodeResponse | undefined =
                    await this._sake.provider?.getBytecode(message.payload);

                webviewView.webview.postMessage({
                    command: message.command,
                    requestId: message.requestId,
                    payload: {
                        bytecode: response ? response.bytecode : undefined
                    }
                } as WebviewMessageResponse);

                break;
            }

            case WebviewMessageId.onrequestNewProvider: {
                this._sake.requestNewProvider();
                break;
            }

            case WebviewMessageId.onSelectChain: {
                this._sake.showProviderSelectionQuickPick();
                break;
            }

            case WebviewMessageId.onRestartWakeServer: {
                const client = SakeContext.getInstance().client;
                if (!client) {
                    console.error('Cannot restart Wake server, no client found');
                    return;
                }

                await restartWakeClient(client);

                webviewView.webview.postMessage({
                    command: message.command,
                    requestId: message.requestId,
                    payload: {
                        success: true
                    }
                } as WebviewMessageResponse);

                break;
            }

            case WebviewMessageId.onOpenSettings: {
                if (!message.payload) {
                    console.error('Cannot open settings, no settings URL provided');
                    return;
                }

                openSettings(message.payload);
                break;
            }

            case WebviewMessageId.onOpenChainsQuickPick: {
                this._sake.showProviderSelectionQuickPick();
                break;
            }

            default: {
                // Pass the message to the inheriting class
                this._onDidReceiveMessage(message);
            }
        }
    }

    /*
     * This method is called when the webview receives a message from the extension and no matching case was found
     * Expected to be overridden by inheriting classes
     */
    protected async _onDidReceiveMessage(message: WebviewMessageRequest) {}
}
