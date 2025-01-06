import * as vscode from 'vscode';
import { BaseWebviewProvider } from './BaseWebviewProvider';

export class SakeWebviewProvider extends BaseWebviewProvider {
    constructor(_extensionUri: vscode.Uri) {
        super(_extensionUri, 'sake');
    }
}
