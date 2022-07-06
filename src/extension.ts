// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import * as net from 'net';

import {
    LanguageClient,
    LanguageClientOptions,
    ServerOptions,
    StreamInfo
} from 'vscode-languageclient/node';


let client: LanguageClient;


// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
    const serverOptions: ServerOptions = () => {
        let socket = net.connect({
            port: 65432,
            host: "127.0.0.1"
        });
        let result: StreamInfo = {
            writer: socket,
            reader: socket
        };
        return Promise.resolve(result);
    }

    const clientOptions: LanguageClientOptions = {
        documentSelector: [{ scheme: 'file', language: 'solidity' }],
        synchronize: {}
    }

    client = new LanguageClient("ABCH Tools for Solidity LSP", serverOptions, clientOptions);
    client.start();
}

// this method is called when your extension is deactivated
export function deactivate() {
    if (!client)
        return undefined;

    return client.stop();
}
