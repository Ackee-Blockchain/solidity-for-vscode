import { execFileSync } from 'child_process';
import * as vscode from 'vscode';
import { URI, Position, LanguageClient, State } from 'vscode-languageclient/node';
import * as os from 'os';
import { GraphvizPreviewGenerator } from './graphviz/GraphvizPreviewGenerator';
import { SakeContext } from './sake/context';
import parser from '@solidity-parser/parser';
import * as fs from 'fs';
import * as path from 'path';

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

export async function generateAbstractionResolvedHandler(
    out: vscode.OutputChannel
) {
    try {
        const activeEditor = vscode.window.activeTextEditor;
        if (!activeEditor || activeEditor.document.languageId !== 'solidity') {
            vscode.window.showErrorMessage('Please open a Solidity file to generate abstraction resolved version.');
            return;
        }

        const document = activeEditor.document;
        const fileName = path.basename(document.fileName, '.sol');
        const fileDir = path.dirname(document.fileName);
        const code = document.getText();

        // Parse the AST
        let ast;
        try {
            ast = parser.parse(code, { loc: true });
        } catch (e) {
            const errMsg = e instanceof Error ? e.message : String(e);
            vscode.window.showErrorMessage('Failed to parse Solidity file: ' + errMsg);
            return;
        }

        // Helper to resolve imports recursively
        const contractMap: Record<string, any> = {};
        const importMap: Record<string, string> = {};
        function resolveImports(ast: any, baseDir: string) {
            parser.visit(ast, {
                ImportDirective: (node: any) => {
                    let importPath = node.path;
                    if (!importPath.endsWith('.sol')) return;
                    let resolvedPath = path.resolve(baseDir, importPath);
                    if (!fs.existsSync(resolvedPath)) return;
                    if (importMap[importPath]) return; // already loaded
                    importMap[importPath] = resolvedPath;
                    const importCode = fs.readFileSync(resolvedPath, 'utf8');
                    let importAst;
                    try {
                        importAst = parser.parse(importCode, { loc: true });
                    } catch (e) { return; }
                    resolveImports(importAst, path.dirname(resolvedPath));
                    parser.visit(importAst, {
                        ContractDefinition: (c: any) => {
                            contractMap[c.name] = c;
                        }
                    });
                },
                ContractDefinition: (c: any) => {
                    contractMap[c.name] = c;
                }
            });
        }

        // Collect all contracts in the current file and imports
        resolveImports(ast, fileDir);

        // Find the main contract (the one at the cursor or first in file)
        let mainContract: any = null;
        parser.visit(ast, {
            ContractDefinition: (c: any) => {
                if (!mainContract) mainContract = c;
            }
        });
        if (!mainContract) {
            vscode.window.showErrorMessage('No contract found in file.');
            return;
        }

        // Recursively collect all base contracts (linearized)
        function getBaseContracts(contract: any): string[] {
            let bases: string[] = [];
            if (contract.baseContracts) {
                for (const base of contract.baseContracts) {
                    const baseName = base.baseName.namePath;
                    if (contractMap[baseName]) {
                        bases.push(baseName);
                        bases = bases.concat(getBaseContracts(contractMap[baseName]));
                    }
                }
            }
            return bases;
        }
        const baseContracts = getBaseContracts(mainContract);
        const allContracts = [...baseContracts.reverse(), mainContract.name];

        // Helper to extract source code by AST location
        function extractSourceByLoc(loc: any) {
            if (!loc) return '';
            const start = document.offsetAt(new vscode.Position(loc.start.line - 1, loc.start.column));
            const end = document.offsetAt(new vscode.Position(loc.end.line - 1, loc.end.column));
            return document.getText().slice(start, end);
        }

        // Helper to extract comments above a node
        function extractCommentsAbove(loc: any) {
            if (!loc) return '';
            const startLine = loc.start.line - 2; // line before the node
            if (startLine < 0) return '';
            const lines = document.getText().split(/\r?\n/);
            let comments = '';
            for (let i = startLine; i >= 0; i--) {
                const line = lines[i].trim();
                if (line.startsWith('//') || line.startsWith('/*')) {
                    comments = line + '\n' + comments;
                } else if (line === '') {
                    continue;
                } else {
                    break;
                }
            }
            return comments;
        }

        // Helper to collect all contract members (with override handling)
        function collectMembers(contracts: string[]) {
            const seenFuncs = new Set();
            const seenVars = new Set();
            const seenEvents = new Set();
            const seenMods = new Set();
            const variables: any[] = [];
            const events: any[] = [];
            const modifiers: any[] = [];
            const functions: any[] = [];
            for (const cname of contracts) {
                const c = contractMap[cname];
                if (!c) continue;
                for (const node of c.subNodes) {
                    if (node.type === 'FunctionDefinition' && (node.name || node.isConstructor)) {
                        const key = node.isConstructor ? 'constructor' : node.name;
                        if (seenFuncs.has(key)) continue;
                        seenFuncs.add(key);
                        functions.push({ ...node, _contract: cname, _type: 'function' });
                    }
                    if (node.type === 'StateVariableDeclaration') {
                        for (const varDecl of node.variables) {
                            if (seenVars.has(varDecl.name)) continue;
                            seenVars.add(varDecl.name);
                            variables.push({ ...varDecl, _contract: cname, _type: 'variable', visibility: node.visibility, typeName: varDecl.typeName || node.typeName, loc: node.loc });
                        }
                    }
                    if (node.type === 'EventDefinition') {
                        if (seenEvents.has(node.name)) continue;
                        seenEvents.add(node.name);
                        events.push({ ...node, _contract: cname, _type: 'event' });
                    }
                    if (node.type === 'ModifierDefinition') {
                        if (seenMods.has(node.name)) continue;
                        seenMods.add(node.name);
                        modifiers.push({ ...node, _contract: cname, _type: 'modifier' });
                    }
                }
            }
            return { variables, events, modifiers, functions };
        }

        // Generate the flattened contract
        let flattened = `// Abstraction Resolved File for ${mainContract.name}\n`;
        flattened += `// Generated on: ${new Date().toISOString()}\n`;
        flattened += `${document.getText().match(/pragma solidity [^;]+;/)?.[0] || ''}\n\n`;
        flattened += `contract ${mainContract.name} {\n`;
        const { variables, events, modifiers, functions } = collectMembers([...baseContracts.reverse(), mainContract.name]);
        // Variables
        if (variables.length > 0) flattened += '    // ---- State Variables ----\n';
        for (const v of variables) {
            flattened += extractCommentsAbove(v.loc);
            flattened += `    // from ${v._contract}\n`;
            flattened += `    ${v.visibility || ''} ${v.typeName?.name || v.typeName?.typeDescriptions?.typeString || ''} ${v.name};\n\n`;
        }
        // Events
        if (events.length > 0) flattened += '    // ---- Events ----\n';
        for (const e of events) {
            flattened += extractCommentsAbove(e.loc);
            flattened += `    // from ${e._contract}\n`;
            flattened += `    event ${e.name}(${(e.parameters || []).map((p: any) => `${p.typeName?.name || p.typeName?.typeDescriptions?.typeString || ''} ${p.name}`).join(', ')});\n\n`;
        }
        // Modifiers
        if (modifiers.length > 0) flattened += '    // ---- Modifiers ----\n';
        for (const m of modifiers) {
            flattened += extractCommentsAbove(m.loc);
            flattened += `    // from ${m._contract}\n`;
            let body = ' { /* ... */ }';
            if (m.body && m.loc && m.body.loc) {
                body = extractSourceByLoc(m.body.loc);
                if (!body.trim().endsWith('}')) body += '}';
            }
            flattened += `    modifier ${m.name}()${body}\n\n`;
        }
        // Functions
        if (functions.length > 0) flattened += '    // ---- Functions ----\n';
        for (const f of functions) {
            flattened += extractCommentsAbove(f.loc);
            flattened += `    // from ${f._contract}\n`;
            // Build function signature
            let sig = '';
            if (f.isConstructor) {
                sig = 'constructor(';
                if (f.parameters && f.parameters.length > 0) {
                    sig += f.parameters.map((p: any) => `${p.typeName?.name || p.typeName?.typeDescriptions?.typeString || ''} ${p.name}`).join(', ');
                }
                sig += ')';
            } else {
                sig = `function ${f.name}(`;
                if (f.parameters && f.parameters.length > 0) {
                    sig += f.parameters.map((p: any) => `${p.typeName?.name || p.typeName?.typeDescriptions?.typeString || ''} ${p.name}`).join(', ');
                }
                sig += ')';
                if (f.visibility) sig += ` ${f.visibility}`;
                if (f.stateMutability && f.stateMutability !== 'nonpayable') sig += ` ${f.stateMutability}`;
                if (f.returnParameters && f.returnParameters.length > 0) {
                    sig += ' returns (' + f.returnParameters.map((p: any) => `${p.typeName?.name || p.typeName?.typeDescriptions?.typeString || ''} ${p.name}`).join(', ') + ')';
                }
            }
            // Function body
            let body = ' { /* ... */ }';
            if (f.body && f.loc && f.body.loc) {
                body = extractSourceByLoc(f.body.loc);
                if (!body.trim().endsWith('}')) body += '}';
            } else if (f._contract !== mainContract.name) {
                // Inherited function, no source: stub
                body = ' { /* inherited */ }';
            }
            flattened += `    ${sig}${body}\n\n`;
        }
        flattened += '}\n';

        // Create a new document with the resolved content
        const newDocument = await vscode.workspace.openTextDocument({
            content: flattened,
            language: 'solidity'
        });
        await vscode.window.showTextDocument(newDocument, vscode.ViewColumn.Beside);
        out.appendLine(`✅ Abstraction resolved file generated for ${mainContract.name}`);
        vscode.window.showInformationMessage(`Abstraction resolved file generated for ${mainContract.name}`);
    } catch (error) {
        out.appendLine(`❌ Error generating abstraction resolved file: ${error}`);
        vscode.window.showErrorMessage(`Error generating abstraction resolved file: ${error}`);
    }
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
