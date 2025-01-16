import { MessageHandlerData } from '@estruyf/vscode';
import * as vscode from 'vscode';
import { restartWakeClient } from '../../commands';
import {
    copyToClipboard,
    getTextFromInputBox,
    navigateTo,
    openExternal,
    openSettings,
    requestAddDeployedContract,
    showAddAbiQuickPick,
    showErrorMessage,
    showProviderSelectionQuickPick
} from '../commands';
import { SakeContext } from '../context';
import * as SakeProviderFactory from '../sake_providers/SakeProviderFactory';
import { sakeProviderManager } from '../sake_providers/SakeProviderManager';
import {
    accountConnector,
    appConnector,
    BaseStateConnector,
    chainStateConnector,
    compilationConnector,
    deploymentConnector,
    historyConnector
} from '../state/StateConnectors';
import { getBasePage } from '../utils/getBasePage';
import { getNonce } from '../utils/getNonce';
import {
    CallType,
    GetBytecodeResponse,
    StateId,
    WebviewMessageId,
    WebviewMessageRequest,
    WebviewMessageResponse
} from '../webview/shared/types';
import { specifyCallType } from '../utils/helpers';

export abstract class BaseWebviewProvider implements vscode.WebviewViewProvider {
    _view?: vscode.WebviewView;
    _doc?: vscode.TextDocument;
    _stateSubscriptions: Map<StateId, BaseStateConnector<any>> = new Map();

    constructor(
        private readonly _extensionUri: vscode.Uri,
        private readonly _targetPath: string
    ) {
        // Subscribe to shared state
        this._subscribeConnectors();
    }

    private _subscribeConnectors() {
        compilationConnector.subscribe(this);
        chainStateConnector.subscribe(this);
        accountConnector.subscribe(this);
        deploymentConnector.subscribe(this);
        historyConnector.subscribe(this);
        appConnector.subscribe(this);
    }

    public resolveWebviewView(webviewView: vscode.WebviewView) {
        this._view = webviewView;

        // Set the webview's initial options
        webviewView.webview.options = {
            enableScripts: true, // Allow scripts in the webview
            localResourceRoots: [this._extensionUri]
        };

        // Handle messages from the webview
        webviewView.webview.onDidReceiveMessage(async (message) => {
            await this._handleMessage(message, webviewView);
        });

        // Set the webview's initial html content
        webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);
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

    public postMessageToWebview(message: WebviewMessageResponse) {
        this._view?.webview.postMessage(message);
    }

    public setSubscribedState(subscribedState: BaseStateConnector<any>) {
        this._stateSubscriptions.set(subscribedState.stateId, subscribedState);
    }

    public unsetSubscribedState(subscribedState: BaseStateConnector<any>) {
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

            case WebviewMessageId.showInfo: {
                vscode.window.showInformationMessage(message.payload);
                break;
            }

            case WebviewMessageId.showError: {
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

            case WebviewMessageId.undeployContract: {
                sakeProviderManager.provider?.removeDeployedContract(message.payload);
                break;
            }

            case WebviewMessageId.compile: {
                await sakeProviderManager.provider?.compile();

                webviewView.webview.postMessage({
                    command: message.command,
                    requestId: message.requestId,
                    payload: {
                        success: true // TODO returns true always
                    }
                } as WebviewMessageResponse);

                break;
            }

            case WebviewMessageId.deploy: {
                const success = await sakeProviderManager.provider?.deployContract(message.payload);

                webviewView.webview.postMessage({
                    command: message.command,
                    requestId: message.requestId,
                    payload: {
                        success
                    }
                } as WebviewMessageResponse);

                break;
            }

            case WebviewMessageId.contractFunctionCall: {
                const callType = specifyCallType(message.payload.functionAbi);
                const provider = sakeProviderManager.provider;

                let success = false;
                if (provider) {
                    switch (callType) {
                        case CallType.Call:
                            success = await provider.callContract(message.payload);
                            break;
                        case CallType.Transact:
                            success = await provider.transactContract(message.payload);
                            break;
                        default:
                            console.error('Invalid call type');
                            break;
                    }
                } else {
                    console.error('Cannot call contract, no provider is selected');
                }

                webviewView.webview.postMessage({
                    command: message.command,
                    requestId: message.requestId,
                    payload: {
                        success
                    }
                } as WebviewMessageResponse);
                break;
            }

            case WebviewMessageId.setBalance: {
                sakeProviderManager.provider?.setAccountBalance(message.payload);
                break;
            }

            case WebviewMessageId.setLabel: {
                sakeProviderManager.provider?.setAccountLabel(message.payload);
                break;
            }

            case WebviewMessageId.navigate: {
                navigateTo(
                    message.payload.path,
                    message.payload.startOffset,
                    message.payload.endOffset
                );
                break;
            }

            case WebviewMessageId.openExternal: {
                openExternal(message.payload.path);
                break;
            }

            case WebviewMessageId.openDeploymentInBrowser: {
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

            case WebviewMessageId.getBytecode: {
                const response: GetBytecodeResponse | undefined =
                    await sakeProviderManager.provider?.getBytecode(message.payload);

                webviewView.webview.postMessage({
                    command: message.command,
                    requestId: message.requestId,
                    payload: {
                        bytecode: response ? response.bytecode : undefined
                    }
                } as WebviewMessageResponse);

                break;
            }

            // case WebviewMessageId.requestNewProvider: {
            //     sakeProviderManager.requestNewProvider();
            //     break;
            // }

            case WebviewMessageId.restartWakeServer: {
                const client = SakeContext.getInstance().client;
                if (!client) {
                    console.error('Cannot restart Wake server, no client found');
                    return;
                }

                await restartWakeClient(client);

                try {
                    if (!sakeProviderManager.provider?.connected) {
                        await sakeProviderManager.provider?.connect();
                    }
                } catch (error) {
                    showErrorMessage(error as string);
                }

                // try to reconnect all providers
                // providerRegistry.getAll().forEach((provider) => {
                //     try {
                //         provider.connect();
                //     } catch (error) {
                //         showErrorMessage(`Failed to reconnect provider ${provider.displayName}`);
                //         console.error(
                //             `Failed to reconnect provider ${provider.displayName}: ${error}`
                //         );
                //     }
                // });
                // await sakeProviderManager.reloadState();

                webviewView.webview.postMessage({
                    command: message.command,
                    requestId: message.requestId,
                    payload: {
                        success: true
                    }
                } as WebviewMessageResponse);

                break;
            }

            case WebviewMessageId.openSettings: {
                if (!message.payload) {
                    console.error('Cannot open settings, no settings URL provided');
                    return;
                }

                openSettings(message.payload);
                break;
            }

            case WebviewMessageId.openChainsQuickPick: {
                showProviderSelectionQuickPick();
                break;
            }

            case WebviewMessageId.openAddAbiQuickPick: {
                showAddAbiQuickPick(message.payload.contractAddress);
                break;
            }

            case WebviewMessageId.removeProxy: {
                sakeProviderManager.provider?.removeProxy(
                    message.payload.contractAddress,
                    message.payload.proxyId
                );
                break;
            }

            case WebviewMessageId.reconnectChain: {
                let success = true;

                try {
                    await sakeProviderManager.provider?.connect();
                } catch (error) {
                    success = false;
                    showErrorMessage(error as string);
                }

                webviewView.webview.postMessage({
                    command: message.command,
                    requestId: message.requestId,
                    payload: {
                        success
                    }
                } as WebviewMessageResponse);

                break;
            }

            case WebviewMessageId.ping: {
                webviewView.webview.postMessage({
                    command: message.command,
                    requestId: message.requestId,
                    payload: {
                        success: true
                    }
                } as WebviewMessageResponse);
                break;
            }

            case WebviewMessageId.createNewLocalChain: {
                const success =
                    (await SakeProviderFactory.createNewLocalProvider(
                        message.payload.displayName,
                        message.payload.networkCreationConfig,
                        message.payload.onlySuccessful
                    )) !== undefined;

                webviewView.webview.postMessage({
                    command: message.command,
                    requestId: message.requestId,
                    payload: {
                        success
                    }
                } as WebviewMessageResponse);
                break;
            }

            case WebviewMessageId.connectToLocalChain: {
                const success =
                    (await SakeProviderFactory.connectToLocalChain(
                        message.payload.displayName,
                        message.payload.uri,
                        message.payload.onlySuccessful
                    )) !== undefined;

                webviewView.webview.postMessage({
                    command: message.command,
                    requestId: message.requestId,
                    payload: {
                        success
                    }
                } as WebviewMessageResponse);

                break;
            }

            case WebviewMessageId.requestAddDeployedContract: {
                requestAddDeployedContract();
                break;
            }

            case WebviewMessageId.toggleAutosave: {
                const provider = sakeProviderManager.provider;
                if (!provider) {
                    console.error('Cannot toggle autosave, no provider found');
                    return;
                }
                const autosave = !provider.providerState.persistence.isAutosaveEnabled;
                provider.setAutosave(!provider.providerState.persistence.isAutosaveEnabled);
                break;
            }

            case WebviewMessageId.saveState: {
                sakeProviderManager.provider?.saveState();
                break;
            }

            case WebviewMessageId.deleteStateSave: {
                sakeProviderManager.provider?.deleteStateSave();
                break;
            }

            case WebviewMessageId.deleteChain: {
                const currentProvider = sakeProviderManager.provider;
                if (!currentProvider) {
                    console.error('Cannot delete chain, no provider found');
                    return;
                }
                sakeProviderManager.removeProvider(currentProvider);
                break;
            }

            case WebviewMessageId.resetChain: {
                throw new Error('Not implemented');
                break;
            }

            case WebviewMessageId.renameChain: {
                const currentProvider = sakeProviderManager.provider;
                if (!currentProvider) {
                    console.error('Cannot rename chain, no provider found');
                    return;
                }

                sakeProviderManager.requestRenameProvider(currentProvider);
                break;
            }

            default: {
                console.error('Unhandled webview message', message);
                // this._onDidReceiveMessage(message);
            }
        }
    }

    /*
     * This method is called when the webview receives a message from the extension and no matching case was found
     * Expected to be overridden by inheriting classes
     */
    protected async _onDidReceiveMessage(message: WebviewMessageRequest) {}
}
