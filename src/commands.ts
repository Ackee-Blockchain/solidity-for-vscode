import { execFileSync } from 'child_process';
import * as vscode from 'vscode';
import { URI, Position, LanguageClient, State } from 'vscode-languageclient/node';
import * as os from 'os';
import { GraphvizPreviewGenerator } from './graphviz/GraphvizPreviewGenerator';
import { SakeContext } from './sake/context';

const fs = require('fs');

async function showDot(content: string, title: string, graphviz: GraphvizPreviewGenerator) {
    const panel = graphviz.createPreviewPanel(content, title, vscode.ViewColumn.Beside);
    await graphviz.updateContent(panel);
}

export async function generateCfgHandler(
    out: vscode.OutputChannel,
    documentUri: URI,
    canonicalName: string,
    graphviz: GraphvizPreviewGenerator
) {
    const cfg: string = await vscode.commands.executeCommand(
        'wake.generate.control_flow_graph',
        documentUri,
        canonicalName
    );

    await showDot(cfg, `${canonicalName} control flow graph`, graphviz);
}

export async function generateInheritanceGraphHandler({
    documentUri,
    canonicalName,
    out,
    graphviz
}: {
    documentUri: URI;
    canonicalName: string;
    out: vscode.OutputChannel;
    graphviz: GraphvizPreviewGenerator;
}) {
    let graph: string;
    if (documentUri === undefined || canonicalName === undefined || out === undefined) {
        graph = await vscode.commands.executeCommand('wake.generate.inheritance_graph_full');
        await showDot(graph, 'Inheritance graph', graphviz);
    } else {
        graph = await vscode.commands.executeCommand(
            'wake.generate.inheritance_graph',
            documentUri,
            canonicalName
        );
        await showDot(graph, `${canonicalName} inheritance graph`, graphviz);
    }
}

export async function generateLinearizedInheritanceGraphHandler(
    out: vscode.OutputChannel,
    documentUri: URI,
    canonicalName: string,
    graphviz: GraphvizPreviewGenerator
) {
    const graph: string = await vscode.commands.executeCommand(
        'wake.generate.linearized_inheritance_graph',
        documentUri,
        canonicalName
    );
    await showDot(graph, `${canonicalName} linearized inheritance graph`, graphviz);
}

export async function copyToClipboardHandler(text: string) {
    await vscode.env.clipboard.writeText(text);
    await vscode.window.showInformationMessage('Copied to clipboard.');
}

export async function importFoundryRemappings(out: vscode.OutputChannel, silent: boolean = false) {
    if (vscode.workspace.workspaceFolders === undefined) {
        if (!silent) {
            vscode.window.showErrorMessage('No workspace folder open.');
        }
        return;
    }

    if (vscode.workspace.workspaceFolders.length > 1) {
        if (!silent) {
            vscode.window.showErrorMessage(
                'Importing remappings is not supported for multi-root workspaces.'
            );
        }
        return;
    }

    const cwd = vscode.workspace.workspaceFolders[0].uri.fsPath;
    let remappings: string[] = [];

    try {
        // First, try to read from remappings.txt
        remappings = fs
            .readFileSync(cwd + '/remappings.txt')
            .toString('utf8')
            .split(/\r?\n/);
    } catch (e) {
        // If remappings.txt doesn't exist or can't be read, try using forge
        try {
            remappings = execFileSync(os.homedir() + '/.foundry/bin/forge', ['remappings'], {
                cwd: cwd
            })
                .toString('utf8')
                .split(/\r?\n/);
        } catch (e) {
            try {
                remappings = execFileSync(os.homedir() + '/.cargo/bin/forge', ['remappings'], {
                    cwd: cwd
                })
                    .toString('utf8')
                    .split(/\r?\n/);
            } catch (e) {
                if (!silent) {
                    vscode.window.showErrorMessage(
                        'Failed to find `remappings.txt` file or `forge` executable.'
                    );
                }
                return;
            }
        }
    }

    remappings = remappings.filter((remapping: string) => remapping !== '');
    vscode.workspace
        .getConfiguration('wake.compiler.solc')
        .update('remappings', remappings, vscode.ConfigurationTarget.Workspace);
    if (!silent) {
        vscode.window.showInformationMessage(`Imported ${remappings.length} remappings.`);
    }
}

export async function generateImportsGraphHandler(
    out: vscode.OutputChannel,
    graphviz: GraphvizPreviewGenerator
) {
    const graph: string = await vscode.commands.executeCommand('wake.generate.imports_graph');
    await showDot(graph, 'Imports graph', graphviz);
}

export async function executeReferencesHandler(
    out: vscode.OutputChannel,
    documentUri: URI,
    position: Position,
    declarationPositions: Array<Position>
) {
    const uri = vscode.Uri.parse(documentUri);
    let res: Array<vscode.Location> = await vscode.commands.executeCommand(
        'vscode.executeReferenceProvider',
        uri,
        position
    );
    if (res !== undefined) {
        res = res.filter((location: vscode.Location) => {
            for (const declarationPosition of declarationPositions) {
                if (
                    location.range.start.line === declarationPosition.line &&
                    location.range.start.character === declarationPosition.character
                ) {
                    return false;
                }
            }
            return true;
        });

        res = res.filter(
            (location: vscode.Location) =>
                location.range.start.line !== position.line ||
                location.range.start.character !== position.character
        );
        await vscode.commands.executeCommand(
            'editor.action.goToLocations',
            uri,
            new vscode.Position(position.line, position.character),
            res,
            'peek',
            'No references found.'
        );
    }
}

export async function newDetector(global: boolean) {
    const name = await vscode.window.showInputBox({ prompt: 'Detector name' });
    if (name === undefined) {
        return;
    }

    const res: string = await vscode.commands.executeCommand('wake.init.detector', name, global);
    if (res !== undefined && res !== '') {
        await vscode.window.showTextDocument(vscode.Uri.parse('file://' + res));
    }
}

export async function newPrinter(global: boolean) {
    const name = await vscode.window.showInputBox({ prompt: 'Printer name' });
    if (name === undefined) {
        return;
    }

    const res: string = await vscode.commands.executeCommand('wake.init.printer', name, global);
    if (res !== undefined && res !== '') {
        await vscode.window.showTextDocument(vscode.Uri.parse('file://' + res));
    }
}

export async function restartWakeClient(client: LanguageClient) {
    console.log('Restarting Wake client');
    if (client.state === State.Running) {
        await client.stop(3000);
    }
    await client.start();
}
