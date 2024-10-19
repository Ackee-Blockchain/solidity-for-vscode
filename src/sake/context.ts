import * as vscode from 'vscode';
import { LanguageClient } from 'vscode-languageclient/node';
import { BaseWebviewProvider } from './providers/BaseWebviewProvider';

export class SakeContext {
    private static _instance: SakeContext;
    private _context?: vscode.ExtensionContext;
    private _client?: LanguageClient;
    private _webviewProvider?: BaseWebviewProvider;

    private constructor() {}

    static getInstance(): SakeContext {
        if (!this._instance) {
            this._instance = new SakeContext();
        }
        return this._instance;
    }

    get context(): vscode.ExtensionContext | undefined {
        return this._context;
    }

    set context(context: vscode.ExtensionContext) {
        this._context = context;
    }

    get client(): LanguageClient | undefined {
        return this._client;
    }

    set client(client: LanguageClient) {
        this._client = client;
    }

    get webviewProvider(): BaseWebviewProvider | undefined {
        return this._webviewProvider;
    }

    set webviewProvider(webviewProvider: BaseWebviewProvider) {
        this._webviewProvider = webviewProvider;
    }
}
