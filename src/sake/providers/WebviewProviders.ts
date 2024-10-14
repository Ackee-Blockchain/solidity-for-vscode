import * as vscode from 'vscode';
import { BaseWebviewProvider } from './BaseWebviewProvider';
import { SakeProviderManager } from '../sake_providers/SakeProviderManager';

export class SakeWebviewProvider extends BaseWebviewProvider {
    constructor(_extensionUri: vscode.Uri) {
        super(_extensionUri, 'sake');
    }
}
