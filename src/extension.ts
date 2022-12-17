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

import { importFoundryRemappings, copyToClipboardHandler, generateCfgHandler, generateInheritanceGraphHandler, generateLinearizedInheritanceGraphHandler, generateImportsGraphHandler } from './commands';
import { hideCoverageCallback, initCoverage, showCoverageCallback } from './coverage';

const path = require('node:path');

import getPort = require('get-port');
import waitPort = require('wait-port');
import { compare } from '@renovatebot/pep440';
import { ChildProcess, execFile, execFileSync } from 'child_process';



let client: LanguageClient | undefined = undefined;
let wokeProcess: ChildProcess | undefined = undefined;

const WOKE_TARGET_VERSION = "2.2.0";
const WOKE_PRERELEASE = false;

async function installWoke(outputChannel: vscode.OutputChannel, pythonExecutable: string): Promise<boolean> {
    try {
        let out;
        if (WOKE_PRERELEASE) {
            outputChannel.appendLine(`Running '${pythonExecutable} -m pip install woke -U --pre'`);
            out = execFileSync(pythonExecutable, ["-m", "pip", "install", "woke", "-U", "--pre"]).toString("utf8");
        } else {
            outputChannel.appendLine(`Running '${pythonExecutable} -m pip install woke -U'`);
            out = execFileSync(pythonExecutable, ["-m", "pip", "install", "woke", "-U"]).toString("utf8");
        }
        outputChannel.appendLine(out);
        return true;
    } catch(err) {
        if (err instanceof Error) {
            outputChannel.appendLine("Failed to execute the previous command:");
            outputChannel.appendLine(err.toString());
        }

        try {
            let out;
            if (WOKE_PRERELEASE) {
                outputChannel.appendLine(`Running '${pythonExecutable} -m pip install woke -U --pre --user'`);
                out = execFileSync(pythonExecutable, ["-m", "pip", "install", "woke", "-U", "--pre", "--user"]).toString("utf8");
            } else {
                outputChannel.appendLine(`Running '${pythonExecutable} -m pip install woke -U --user'`);
                out = execFileSync(pythonExecutable, ["-m", "pip", "install", "woke", "-U", "--user"]).toString("utf8");
            }
            outputChannel.appendLine(out);
            return true;
        } catch(err) {
            if (err instanceof Error) {
                outputChannel.appendLine("Failed to install PyPi package 'woke':");
                outputChannel.appendLine(err.toString());
            }
            return false;
        }
    }
}

function getWokeVersion(cwd?: string): string {
    if (cwd === undefined) {
        return execFileSync("woke", ["--version"]).toString("utf8").trim();
    }
    else {
        return execFileSync("./woke", ["--version"], {"cwd": cwd}).toString("utf8").trim();
    }
}

async function checkWokeInstalled(outputChannel: vscode.OutputChannel, cwd?: string): Promise<boolean> {
    try {
        const version: string = getWokeVersion(cwd);

        if (compare(version, WOKE_TARGET_VERSION) < 0) {
            if (cwd === undefined) {
                outputChannel.appendLine(`Found 'woke' in version ${version} in PATH but the target minimal version is ${WOKE_TARGET_VERSION}.`);
            } else {
                outputChannel.appendLine(`Found 'woke' in version ${version} in '${cwd}' but the target minimal version is ${WOKE_TARGET_VERSION}.`);
            }
            return false;
        }
        return true;
    } catch(err) {
        return false;
    }
}

async function findWokeDir(outputChannel: vscode.OutputChannel, pythonExecutable: string): Promise<string|boolean|undefined> {
    let installed: boolean = await checkWokeInstalled(outputChannel);
    let cwd: string|undefined = undefined;

    if (!installed) {
        const globalPackages = execFileSync(pythonExecutable, ["-c", 'import os, sysconfig; print(sysconfig.get_path("scripts"))']).toString("utf8").trim();
        installed = await checkWokeInstalled(outputChannel, globalPackages);
        if (installed) {
            outputChannel.appendLine(`Consider adding '${globalPackages}' to your PATH environment variable.`);
            cwd = globalPackages;
        }
    }
    if (!installed) {
        const userPackages = execFileSync(pythonExecutable, ["-c", 'import os, sysconfig; print(sysconfig.get_path("scripts",f"{os.name}_user"))']).toString("utf8").trim();
        installed = await checkWokeInstalled(outputChannel, userPackages);
        if (installed) {
            outputChannel.appendLine(`Consider adding '${userPackages}' to your PATH environment variable.`);
            cwd = userPackages;
        }
    }
    if (!installed) {
        return false;
    }

    return cwd;
}

function findPython(outputChannel: vscode.OutputChannel): string {
    try {
        const pythonVersion = execFileSync("python3", ["-c", 'import sys; print(f"{sys.version_info[0]}.{sys.version_info[1]}.{sys.version_info[2]}")']).toString("utf8").trim();

        if (compare(pythonVersion, "3.7.0") < 0) {
            outputChannel.appendLine(`Found Python in version ${pythonVersion}. Python >=3.7 must be installed.`);
            throw new Error("Python version too old");
        }
        return "python3";
    } catch(err) {
        try {
            const pythonVersion = execFileSync("python", ["-c", 'import sys; print(f"{sys.version_info[0]}.{sys.version_info[1]}.{sys.version_info[2]}")']).toString("utf8").trim();

            if (compare(pythonVersion, "3.7.0") < 0) {
                outputChannel.appendLine(`Found Python in version ${pythonVersion}. Python >=3.7 must be installed.`);
                throw new Error("Python version too old");
            }
            return "python";
        } catch(err) {
            outputChannel.appendLine("Python >=3.7 must be installed.");
            throw new Error("Python not found");
        }
    }
}


// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export async function activate(context: vscode.ExtensionContext) {
    const outputChannel = vscode.window.createOutputChannel("Tools for Solidity", "tools-for-solidity-output");
    outputChannel.show(true);

    const extensionConfig: vscode.WorkspaceConfiguration = vscode.workspace.getConfiguration("Tools-for-Solidity");
    const autoInstall: boolean = extensionConfig.get<boolean>('Woke.autoInstall', true);
    let installed: boolean = false;
    let cwd: string|undefined = undefined;

    if (autoInstall) {
        const pythonExecutable = findPython(outputChannel);

        let result: string|boolean|undefined = await findWokeDir(outputChannel, pythonExecutable);
        if (result === false || result === true) {
            outputChannel.appendLine("Installing PyPi package 'woke'.");
            installed = await installWoke(outputChannel, pythonExecutable);

            if (installed) {
                result = await findWokeDir(outputChannel, pythonExecutable);

                if (result === false || result === true) {
                    outputChannel.appendLine("'woke' installed but cannot be found in PATH or pip site-packages.");
                }
                else {
                    cwd = result;
                }
            }
        } else {
            cwd = result;
        }
    }

    try {
        const version: string = getWokeVersion(cwd);
        if (compare(version, WOKE_TARGET_VERSION) < 0) {
            outputChannel.appendLine(`PyPi package 'woke' in version ${version} installed but the target minimal version is ${WOKE_TARGET_VERSION}. Exiting...`);
            return;
        }
    } catch(err) {
        if (err instanceof Error) {
            outputChannel.appendLine(err.toString());
        }
        outputChannel.appendLine(`Unable to determine the version of 'woke' PyPi package.`);
        return;
    }

    const freePort: number = await getPort();

    let wokePath: string = "woke";
    if (cwd !== undefined) {
        wokePath = path.join(cwd, "woke");
    }

    outputChannel.appendLine(`Running '${wokePath} lsp --port ${freePort}'`);
    if (cwd === undefined) {
        wokeProcess = execFile("woke", ["lsp", "--port", String(freePort)], (error, stdout, stderr) => {
            if (error) {
                outputChannel.appendLine(error.message);
                throw error;
            }
        });
    } else {
        wokeProcess = execFile("./woke", ["lsp", "--port", String(freePort)], {cwd: cwd}, (error, stdout, stderr) => {
            if (error) {
                outputChannel.appendLine(error.message);
                throw error;
            }
        });
    }
    wokeProcess.on('exit', () => wokeProcess = undefined);

    if (!await waitPort({
        host: "127.0.0.1",
        port: freePort,
        timeout: 15000
    })) {
        outputChannel.appendLine(`Timed out waiting for port ${freePort} to open.`);
    }

    const serverOptions: ServerOptions = async () => {
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

    client = new LanguageClient("Tools-for-Solidity", "Tools for Solidity", serverOptions, clientOptions);

    context.subscriptions.push(vscode.commands.registerCommand("Tools-for-Solidity.generate.control_flow_graph", async (documentUri, canonicalName) => await generateCfgHandler(outputChannel, documentUri, canonicalName)));
    context.subscriptions.push(vscode.commands.registerCommand("Tools-for-Solidity.generate.inheritance_graph", async (documentUri, canonicalName) => await generateInheritanceGraphHandler({documentUri, canonicalName, out: outputChannel})));
    context.subscriptions.push(vscode.commands.registerCommand("Tools-for-Solidity.generate.linearized_inheritance_graph", async (documentUri, canonicalName) => await generateLinearizedInheritanceGraphHandler(outputChannel, documentUri, canonicalName)));
    context.subscriptions.push(vscode.commands.registerCommand("Tools-for-Solidity.copy_to_clipboard", async (text) => await copyToClipboardHandler(text)));
    context.subscriptions.push(vscode.commands.registerCommand("Tools-for-Solidity.foundry.import_remappings", async () => await importFoundryRemappings(outputChannel)));
    context.subscriptions.push(vscode.commands.registerCommand("Tools-for-Solidity.generate.imports_graph", async () => await generateImportsGraphHandler(outputChannel)));

    initCoverage(outputChannel);
    context.subscriptions.push(vscode.commands.registerCommand("Tools-for-Solidity.coverage.show", showCoverageCallback));
    context.subscriptions.push(vscode.commands.registerCommand("Tools-for-Solidity.coverage.hide", hideCoverageCallback));

    client.start();
}

// this method is called when your extension is deactivated
export function deactivate() {
    if (client !== undefined) {
        client.stop();
    }
    if (wokeProcess !== undefined) {
        if (!wokeProcess.kill()) {
            wokeProcess.kill("SIGKILL");
        }
    }
}
