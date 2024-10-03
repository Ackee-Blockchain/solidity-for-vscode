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
