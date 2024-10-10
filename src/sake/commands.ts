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

export async function loadSampleAbi() {
    return sampleAbi;
}

export async function getTextFromInputBox(initialValue: string) {
    const value = await vscode.window.showInputBox({
        value: initialValue
    });
    return value;
}

export function showTimedInfoMessage(message: string, milliseconds: number = 5000) {
    vscode.window.withProgress(
        {
            location: vscode.ProgressLocation.Notification,
            title: message,
            cancellable: false
        },
        async (progress) => {
            // Set progress to 100% immediately
            progress.report({ increment: 100 });

            // Wait for 3 seconds (or the specified milliseconds)
            await new Promise((resolve) => setTimeout(resolve, milliseconds));
        }
    );
}
