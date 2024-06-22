import * as vscode from 'vscode';
import { BaseWebviewProvider } from './BaseWebviewProvider';
import { loadSampleAbi } from '../commands';
import { MessageHandlerData } from '@estruyf/vscode';
import { WebviewMessageData } from '../webview/shared/types';

export class CompilerWebviewProvider extends BaseWebviewProvider {
    constructor(_extensionUri: vscode.Uri) {
        super(_extensionUri, 'compiler');
    }
}

export class DeployWebviewProvider extends BaseWebviewProvider {
    constructor(_extensionUri: vscode.Uri) {
        super(_extensionUri, 'compile-deploy');
    }

    protected override async _onDidReceiveMessage(message: WebviewMessageData) {
        const { command, requestId, stateId, payload } = message;

        switch (command) {
            case 'getSampleContractAbi': {
                const sampleContractAbi = await loadSampleAbi();
                this._view?.webview.postMessage({
                    command,
                    requestId,
                    payload: sampleContractAbi
                } as MessageHandlerData<string>);
                break;
            }
        }
    }
}

export class RunWebviewProvider extends BaseWebviewProvider {
    constructor(_extensionUri: vscode.Uri) {
        super(_extensionUri, 'run');
    }
}

export class SakeWebviewProvider extends BaseWebviewProvider {
    constructor(_extensionUri: vscode.Uri) {
        super(_extensionUri, 'sake');
    }
}
