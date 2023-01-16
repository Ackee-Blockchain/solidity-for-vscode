import { execFile, execFileSync } from 'child_process';
import * as vscode from 'vscode';
import { URI } from 'vscode-languageclient/node';
import * as os from 'os';
const fs = require("fs");

async function showDot(content: string, out?: vscode.OutputChannel) {
    const activeEditor = vscode.window.activeTextEditor;
    const activeColumn = activeEditor?.viewColumn;
    const activeTextDocument = activeEditor?.document;

    vscode.workspace.openTextDocument({language: 'dot', content: content}).then(async doc => {
        await vscode.window.showTextDocument(doc);

        try {
            await vscode.commands.executeCommand('graphviz.previewToSide', doc.uri);
        } catch (e) {
            try {
                await vscode.commands.executeCommand('graphviz.showPreviewToSide');
            } catch (e) {
                try {
                    await vscode.commands.executeCommand('graphviz-interactive-preview.preview.beside', {uri: doc.uri});
                } catch (e) {
                    await vscode.window.showErrorMessage("Failed to show graphviz preview. Please install one of supported Graphviz (DOT) preview extensions.");
                    return;
                }
            }
        }

        if (activeEditor !== undefined && activeColumn !== undefined && activeTextDocument !== undefined) {
            await vscode.window.showTextDocument(activeTextDocument, activeColumn);
        }
    });
}

export async function generateCfgHandler(out: vscode.OutputChannel, documentUri: URI, canonicalName: string) {
    const cfg: string = await vscode.commands.executeCommand('woke.generate.control_flow_graph', documentUri, canonicalName);

    await showDot(cfg, out);
}

export async function generateInheritanceGraphHandler({ documentUri, canonicalName, out }: {documentUri: URI, canonicalName: string, out: vscode.OutputChannel}) {
    let graph: string;
    if (documentUri === undefined || canonicalName === undefined || out === undefined) {
        graph = await vscode.commands.executeCommand('woke.generate.inheritance_graph_full');
        await showDot(graph);
    }
    else {
        graph = await vscode.commands.executeCommand('woke.generate.inheritance_graph', documentUri, canonicalName);
        await showDot(graph, out);
    }
}

export async function generateLinearizedInheritanceGraphHandler(out: vscode.OutputChannel, documentUri: URI, canonicalName: string) {
    const graph: string = await vscode.commands.executeCommand('woke.generate.linearized_inheritance_graph', documentUri, canonicalName);
    await showDot(graph, out);
}

export async function copyToClipboardHandler(text: string) {
    await vscode.env.clipboard.writeText(text);
    await vscode.window.showInformationMessage("Copied to clipboard.");
}

export async function importFoundryRemappings(out: vscode.OutputChannel) {
    if (vscode.workspace.workspaceFolders === undefined) {
        vscode.window.showErrorMessage("No workspace folder open.");
        return;
    }

    const cwd = vscode.workspace.workspaceFolders[0].uri.fsPath;
    let remappings: string[] = [];

    try {
        remappings = execFileSync(os.homedir() + "/.foundry/bin/forge", ["remappings"], {cwd: cwd}).toString("utf8").split(/\r?\n/);
    } catch(e) {
        try {
            remappings = execFileSync(os.homedir() + "/.cargo/bin/forge", ["remappings"], {cwd: cwd}).toString("utf8").split(/\r?\n/);
        } catch(e) {
            try {
                if (vscode.workspace.workspaceFolders !== undefined) {
                    remappings = fs.readFileSync(cwd + "/remappings.txt").toString("utf8").split(/\r?\n/);
                } else {
                    vscode.window.showErrorMessage("Failed to find `forge` executable or `remappings.txt` file.");
                    return;
                }
            } catch(e) {
                vscode.window.showErrorMessage("Failed to find `forge` executable or `remappings.txt` file.");
                return;
            }
        }
    }

    remappings = remappings.filter((remapping: string) => remapping !== "");
    vscode.workspace.getConfiguration("woke.compiler.solc").update("remappings", remappings, vscode.ConfigurationTarget.Workspace);
    vscode.window.showInformationMessage(`Imported ${remappings.length} remappings.`);
}