import * as _vscode from 'vscode';

declare global {
    const vscodeApi: {
        postMessage(message: any): void;
    };
}