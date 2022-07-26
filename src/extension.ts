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
import { compare } from '@renovatebot/pep440';
import { ChildProcess, execFile, execFileSync } from 'child_process';



let client: LanguageClient;

const TARGET_VERSION = "0.1.2";

async function installWoke(outputChannel: vscode.OutputChannel) {
    try {
        outputChannel.appendLine("Running 'python3 -m pip install abch-woke -U'");
        let out = execFileSync("python3", ["-m", "pip", "install", "abch-woke", "-U"]).toString("utf8");
        outputChannel.appendLine(out);

    } catch(err) {
        if (err instanceof Error) {
            outputChannel.appendLine("Failed to install PyPi package 'abch-woke':");
            outputChannel.appendLine(err.toString());
        }
    }

}

function getWokeVersion(): string {
    return execFileSync("woke", ["--version"]).toString("utf8").trim();
}

async function checkWokeInstalled(outputChannel: vscode.OutputChannel) {
    try {
        const version: string = getWokeVersion();

        if (compare(version, TARGET_VERSION) < 0) {
            outputChannel.appendLine(`PyPi package 'abch-woke' in version ${version} installed but the target minimal version is ${TARGET_VERSION}.`);
            await installWoke(outputChannel);
        }

    } catch(err) {
        if (err instanceof Error) {
            outputChannel.appendLine(err.toString());
        }
        outputChannel.appendLine("Installing PyPi package 'abch-woke'.");
        await installWoke(outputChannel);
    }

}


// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export async function activate(context: vscode.ExtensionContext) {
    const outputChannel = vscode.window.createOutputChannel("ABCH Tools for Solidity", "abch-tools-for-solidity-output");
    outputChannel.show(true);

    const extensionConfig: vscode.WorkspaceConfiguration = vscode.workspace.getConfiguration("ABCH-Tools-for-Solidity");
    const autoInstall: boolean = extensionConfig.get<boolean>('Woke.autoInstall', true);

    if (autoInstall) {
        try {
            const pythonVersion = execFileSync("python3", ["-c", 'import sys; print(f"{sys.version_info[0]}.{sys.version_info[1]}.{sys.version_info[2]}")']).toString("utf8").trim();

            if (compare(pythonVersion, "3.7.0") < 0) {
                outputChannel.appendLine(`Found Python in version ${pythonVersion}. Python >=3.7 must be installed.`);
                return;
            }

        } catch(err) {
            if (err instanceof Error) {
                outputChannel.appendLine(err.toString());
            }
            outputChannel.appendLine("Unable to determine the version of Python. Python >=3.7 must be installed.");
            return;
        }
        await checkWokeInstalled(outputChannel);
    }

    try {
        const version: string = getWokeVersion();
        if (compare(version, TARGET_VERSION) < 0) {
            outputChannel.appendLine(`PyPi package 'abch-woke' in version ${version} installed but the target minimal version is ${TARGET_VERSION}. Exiting...`);
            return;
        }
    } catch(err) {
        if (err instanceof Error) {
            outputChannel.appendLine(err.toString());
        }
        outputChannel.appendLine(`Unable to determine the version of 'abch-woke' PyPi package. Please make sure that 'woke' executable is in your PATH. Exiting...`);
        return;
    }

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
