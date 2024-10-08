import * as vscode from 'vscode';

export async function copyToClipboard(text: string | undefined) {
    if (!text) {
        vscode.window.showErrorMessage('Could not copy to clipboard.');
        return;
    }
    await vscode.env.clipboard.writeText(text);
    await vscode.window.showInformationMessage('Copied to clipboard.');
}

export async function getTextFromInputBox(title?: string, value?: string) {
    const result = await vscode.window.showInputBox({
        title,
        value
    });
    return result;
}

export async function navigateTo(path: string, startOffset?: number, endOffset?: number) {
    const uri = vscode.Uri.parse(path);

    const doc = await vscode.workspace.openTextDocument(uri);
    if (!doc) {
        return;
    }

    const editor = vscode.window.showTextDocument(doc);
    if (!editor) {
        return;
    }

    if (!startOffset || !endOffset) {
        return;
    }

    const startPosition = doc.positionAt(startOffset);
    const endPosition = doc.positionAt(endOffset);

    const range = new vscode.Range(startPosition, endPosition);

    if (vscode.window.activeTextEditor) {
        const target = new vscode.Selection(
            range.start.line,
            range.start.character,
            range.end.line,
            range.end.character
        );
        vscode.window.activeTextEditor.selection = target;
        vscode.window.activeTextEditor.revealRange(target, vscode.TextEditorRevealType.InCenter);
    }
}

export async function openExternal(path: string) {
    vscode.env.openExternal(vscode.Uri.parse(path));
}

export async function showTimedInfoMessage(message: string, milliseconds: number = 3000) {
    await vscode.window.withProgress(
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

export function showErrorMessage(message: string) {
    vscode.window.showErrorMessage(message);
}
