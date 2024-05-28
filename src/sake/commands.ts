import * as vscode from 'vscode';
import { sampleAbi } from './utils/sample.abi';

export async function copyToClipboardHandler(text: string) {
    await vscode.env.clipboard.writeText(text);
    await vscode.window.showInformationMessage("Copied to clipboard.");
}

export async function loadSampleAbi() {
    return sampleAbi;
}

export async function getTextFromInputBox(initialValue: string) {
    const value = await vscode.window.showInputBox({
        value: initialValue,
    });
    return value;
}