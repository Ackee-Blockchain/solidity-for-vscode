import * as vscode from 'vscode';
import { URI } from 'vscode-languageclient/node';

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