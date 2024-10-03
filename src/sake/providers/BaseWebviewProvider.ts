import * as vscode from 'vscode';
import { getNonce } from '../utils/getNonce';
import { getBasePage } from '../utils/getBasePage';
import { MessageHandlerData } from '@estruyf/vscode';
import { copyToClipboard } from '../commands';
import {
    StateId,
    WebviewMessageData,
    WebviewMessage,
    WakeDeploymentRequestParams,
    DeploymentState,
    WakeSetLabelRequestParams,
    WakeGetBytecodeRequestParams,
    WakeGetBytecodeResponse,
    GetBytecodeResponse
} from '../webview/shared/types';

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
            localResourceRoots: [this._extensionUri]
        };

        // Set the webview's initial html content
        webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);

        // Subscribe to states
        DeploymentState.getInstance().subscribe(this);
        CompilationState.getInstance().subscribe(this);
        AccountState.getInstance().subscribe(this);
        WakeState.getInstance().subscribe(this);

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

    public postMessageToWebview(message: WebviewMessageData) {
        this._view?.webview.postMessage(message);
    }

    public setSubscribedState(subscribedState: BaseState<any>) {
        this._stateSubscriptions.set(subscribedState.stateId, subscribedState);
    }

    public unsetSubscribedState(subscribedState: BaseState<any>) {
        this._stateSubscriptions.delete(subscribedState.stateId);
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

    protected _getDeployedContracts(): DeploymentState {
        return this._getStateObject(StateId.DeployedContracts);
    }

    private async _handleMessage(message: WebviewMessageData, webviewView: vscode.WebviewView) {
        const { command, requestId, payload } = message;

        switch (command) {
            // TODO: change strings to enums
            case 'onInfo': {
                if (!payload) {
                    return;
                }
                vscode.window.showWarningMessage(payload);
                break;
            }

            case WebviewMessage.onError: {
                if (!payload) {
                    return;
                }
                vscode.window.showErrorMessage(payload);
                break;
            }

            case WebviewMessage.getTextFromInputBox: {
                const value = await vscode.window.showInputBox(payload);
                webviewView.webview.postMessage({
                    command,
                    requestId,
                    payload: value
                } as MessageHandlerData<string>);
                break;
            }

            case WebviewMessage.copyToClipboard: {
                if (!payload) {
                    return;
                }
                copyToClipboard(payload);
                break;
            }

            case 'setState': {
                const _stateId = payload as StateId;
                if (_stateId === undefined || !this._stateSubscriptions.has(_stateId)) {
                    // console.error(`A provider ${this._targetPath} tried to set state which it does not subscribe to: ${stateId}`);
                    // Send a response to the webview that the state was not set
                    webviewView.webview.postMessage({
                        command,
                        requestId,
                        payload: false
                    } as MessageHandlerData<boolean>);
                    break;
                }

                const state = this._stateSubscriptions.get(_stateId);
                state && (state.state = payload);

                // Send a response to the webview that the state was set
                webviewView.webview.postMessage({
                    command,
                    requestId,
                    stateId: _stateId,
                    payload: true
                } as MessageHandlerData<boolean>);

                break;
            }

            case WebviewMessage.getState: {
                const _stateId = payload as StateId;
                if (_stateId === undefined || !this._stateSubscriptions.has(_stateId)) {
                    webviewView.webview.postMessage({
                        command,
                        requestId,
                        payload: undefined
                    } as MessageHandlerData<any>);
                    break;
                }

                const state = this._stateSubscriptions.get(_stateId);
                webviewView.webview.postMessage({
                    command,
                    requestId,
                    stateId: _stateId,
                    payload: state?.state
                } as MessageHandlerData<any>);
                break;
            }

            case WebviewMessage.onUndeployContract: {
                if (!payload) {
                    return;
                }

                this._getDeployedContracts().undeploy(payload);

                break;
            }

            case WebviewMessage.onCompile: {
                const success = await vscode.commands.executeCommand<boolean>(
                    'Tools-for-Solidity.sake.compile'
                );

                webviewView.webview.postMessage({
                    command,
                    requestId,
                    payload: success
                } as MessageHandlerData<boolean>);

                break;
            }

            case WebviewMessage.onDeploy: {
                if (!payload) {
                    console.error('No deployment params provided');
                    return;
                }

                const success = await vscode.commands.executeCommand<boolean>(
                    'Tools-for-Solidity.sake.deploy',
                    payload
                );

                webviewView.webview.postMessage({
                    command,
                    requestId,
                    payload: success
                } as MessageHandlerData<boolean>);

                break;
            }

            case WebviewMessage.onGetAccounts: {
                const success = await vscode.commands.executeCommand<boolean>(
                    'Tools-for-Solidity.sake.getAccounts'
                );

                webviewView.webview.postMessage({
                    command,
                    requestId,
                    payload: success
                } as MessageHandlerData<boolean>);

                break;
            }

            case WebviewMessage.onContractFunctionCall: {
                if (!payload) {
                    console.error('No function call params provided');
                    return;
                }

                const success = await vscode.commands.executeCommand<boolean>(
                    'Tools-for-Solidity.sake.call',
                    payload
                );

                webviewView.webview.postMessage({
                    command,
                    requestId,
                    payload: success
                } as MessageHandlerData<boolean>);

                break;
            }

            case WebviewMessage.onGetBalances: {
                if (!payload) {
                    console.error('No get balance params provided'); // @todo rename
                    return;
                }

                const success = await vscode.commands.executeCommand<boolean>(
                    'Tools-for-Solidity.sake.getBalances',
                    payload
                );

                webviewView.webview.postMessage({
                    command,
                    requestId,
                    payload: success
                } as MessageHandlerData<boolean>);

                break;
            }

            case WebviewMessage.onSetBalances: {
                if (!payload) {
                    console.error('No set balance params provided'); // @todo rename
                    return;
                }

                const success = await vscode.commands.executeCommand<boolean>(
                    'Tools-for-Solidity.sake.setBalances',
                    payload
                );

                webviewView.webview.postMessage({
                    command,
                    requestId,
                    payload: success
                } as MessageHandlerData<boolean>);

                break;
            }

            case WebviewMessage.onsetLabel: {
                if (!payload) {
                    console.error('No set contract nick params provided');
                    return;
                }

                const nick = await vscode.window.showInputBox({
                    value: '',
                    title: 'Set a contract nickname'
                });

                if (nick === undefined) {
                    webviewView.webview.postMessage({
                        command,
                        requestId,
                        payload: false
                    } as MessageHandlerData<boolean>);
                    return;
                }

                vscode.commands.executeCommand('Tools-for-Solidity.sake.setLabel', {
                    address: (payload as DeploymentState).address,
                    label: nick ? nick : null
                } as WakeSetLabelRequestParams);

                this._getDeployedContracts().update({
                    ...(payload as DeploymentState),
                    nick: nick ? nick : null
                });

                webviewView.webview.postMessage({
                    command,
                    requestId,
                    payload: true
                } as MessageHandlerData<boolean>);
            }

            case WebviewMessage.onNavigate: {
                if (!payload) {
                    console.error('No navigate params provided');
                    return;
                }

                const uri = vscode.Uri.parse(payload.path);

                const doc = await vscode.workspace.openTextDocument(uri);
                if (!doc) {
                    return;
                }

                const editor = vscode.window.showTextDocument(doc);
                if (!editor) {
                    return;
                }

                if (!payload.startOffset || !payload.endOffset) {
                    return;
                }

                const startPosition = doc.positionAt(payload.startOffset);
                const endPosition = doc.positionAt(payload.endOffset);

                const range = new vscode.Range(startPosition, endPosition);

                if (vscode.window.activeTextEditor) {
                    const target = new vscode.Selection(
                        range.start.line,
                        range.start.character,
                        range.end.line,
                        range.end.character
                    );
                    vscode.window.activeTextEditor.selection = target;
                    vscode.window.activeTextEditor.revealRange(
                        target,
                        vscode.TextEditorRevealType.InCenter
                    );
                }
            }

            case WebviewMessage.onOpenExternal: {
                if (!payload) {
                    console.error('No external link provided');
                    return;
                }

                const { path } = payload;

                vscode.env.openExternal(vscode.Uri.parse(path));
            }

            case WebviewMessage.onOpenDeploymentInBrowser: {
                if (!payload) {
                    console.error('No deployment params provided');
                    return;
                }

                const success = await vscode.commands.executeCommand<boolean>(
                    'Tools-for-Solidity.sake.openDeploymentInBrowser',
                    payload
                );

                webviewView.webview.postMessage({
                    command,
                    requestId,
                    payload: success
                } as MessageHandlerData<boolean>);

                break;
            }

            case WebviewMessage.onGetBytecode: {
                if (!payload) {
                    console.error('No bytecode params provided');
                    return;
                }

                const response = await vscode.commands.executeCommand<GetBytecodeResponse>(
                    'Tools-for-Solidity.sake.getBytecode',
                    payload
                );

                webviewView.webview.postMessage({
                    command,
                    requestId,
                    payload: response
                } as MessageHandlerData<WakeGetBytecodeResponse>);
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
