import * as vscode from 'vscode';
import { sampleAbi } from './utils/sample.abi';

export async function copyToClipboard(text: string | undefined) {
    if (!text) {
        vscode.window.showErrorMessage('Could not copy to clipboard.');
        return;
    }
    await vscode.env.clipboard.writeText(text);
    await vscode.window.showInformationMessage('Copied to clipboard.');
}

export async function getTextFromInputBox(initialValue: string) {
    const value = await vscode.window.showInputBox({
        value: initialValue
    });
    return value;
}
