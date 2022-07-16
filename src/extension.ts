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

import getPort = require('get-port');
import waitPort = require('wait-port');
import { ChildProcess, execFile } from 'child_process';



let client: LanguageClient;


// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
    const outputChannel = vscode.window.createOutputChannel("ABCH Tools for Solidity", "abch-tools-for-solidity-output");
    outputChannel.show(true);

    const serverOptions: ServerOptions = async () => {
        const freePort: number = await getPort();

        const process: ChildProcess = execFile("woke", ["lsp", "--port", String(freePort)], (error, stdout, stderr) => {
            if (error) {
                outputChannel.appendLine(error.message);
                throw error;
            }
        });

        await waitPort({
            host: "127.0.0.1",
            port: freePort,
            timeout: 5000
        });

        let socket = net.connect({
            port: freePort,
            host: "127.0.0.1"
        });
        let result: StreamInfo = {
            writer: socket,
            reader: socket
        };
        return result;
    };

    const clientOptions: LanguageClientOptions = {
        documentSelector: [{ scheme: 'file', language: 'solidity' }],
        synchronize: { configurationSection: 'woke'},
        outputChannel: outputChannel
    };

    client = new LanguageClient("ABCH-Tools-for-Solidity", "ABCH Tools for Solidity", serverOptions, clientOptions);
    client.start();
}

// this method is called when your extension is deactivated
export function deactivate() {
    if (!client) {
        return undefined;
    }

    return client.stop();
}
