import * as vscode from 'vscode';
import { compare } from '@renovatebot/pep440';

interface CoverageItem {
    startLine: number;
    startColumn: number;
    endLine: number;
    endColumn: number;
    coverageHits: number;
}

interface FunctionCoverageItem extends CoverageItem {
    branchRecords: CoverageItem[];
    modRecords: CoverageItem[];
    name: string;
}

interface CoverageData {
    [path: string]: FunctionCoverageItem[];
}

interface CoverageHeader {
    version: string;
    data: CoverageData;
}

let coverageData: CoverageData;
const decorationTypes: vscode.TextEditorDecorationType[] = [];
const disposables: { dispose(): any }[] = [];
let outputChannel: vscode.OutputChannel;
let fsWatcher: vscode.FileSystemWatcher;

export function initCoverage(channel: vscode.OutputChannel) {
    outputChannel = channel;

    const options: vscode.DecorationRenderOptions[] = [
        { backgroundColor: 'rgba(255, 102, 102, 0.3)' },
        { backgroundColor: 'rgba(255, 165, 0, 0.3)' },
        { backgroundColor: 'rgba(255, 255, 0, 0.3)' },
        { backgroundColor: 'rgba(144, 238, 144, 0.3)' },
        { backgroundColor: 'rgba(0, 255, 0, 0.3)' }
    ];
    options.forEach((o) => {
        decorationTypes.push(vscode.window.createTextEditorDecorationType(o));
    });
}

export function showCoverageCallback() {
    hideCoverageCallback();

    disposables.push(
        vscode.window.onDidChangeVisibleTextEditors((editors) => {
            editors.forEach((e) => {
                applyDecorationsOnTextEditor(e);
            });
        })
    );

    const options: vscode.OpenDialogOptions = {
        defaultUri:
            vscode.workspace.workspaceFolders !== undefined
                ? vscode.workspace.workspaceFolders[0].uri
                : undefined,
        canSelectFiles: true,
        canSelectFolders: false,
        canSelectMany: false,
        filters: {
            'Coverage (*.cov)': ['cov']
        }
    };
    vscode.window.showOpenDialog(options).then((uri) => {
        if (uri !== undefined) {
            // register file system watcher for the coverage file
            fsWatcher = vscode.workspace.createFileSystemWatcher(
                new vscode.RelativePattern(uri[0], '*'),
                true,
                false,
                true
            );
            disposables.push(fsWatcher);
            fsWatcher.onDidChange((changeUri) => {
                if (changeUri.toString() === uri[0].toString()) {
                    vscode.workspace.fs.readFile(uri[0]).then((data) => {
                        loadCoverage(data);
                    });
                }
            });

            vscode.workspace.fs.readFile(uri[0]).then((data) => {
                loadCoverage(data);
            });
        }
    });
}

export function hideCoverageCallback() {
    disposables.forEach((d) => d.dispose());
    disposables.length = 0;

    clearDecorations();
}

function clearDecorations() {
    // clear decorations
    vscode.window.visibleTextEditors.forEach((e) => {
        for (let i = 0; i < decorationTypes.length; i++) {
            e.setDecorations(decorationTypes[i], []);
        }
    });
}

function loadCoverage(data: Uint8Array) {
    clearDecorations();

    const jsonString = Buffer.from(data).toString('utf-8');
    const coverage = JSON.parse(jsonString) as CoverageHeader;

    if (compare(coverage.version, '1.0.0') < 0) {
        const message = `Coverage data version ${coverage.version} is not supported. Please collect new coverage data with up-to-date version of Wake.`;
        outputChannel.appendLine(message);
        vscode.window.showErrorMessage(message);
        return;
    }

    if (compare(coverage.version, '2.0.0') >= 0) {
        const message = `Coverage data version ${coverage.version} is not supported. Please update the Solidity extension.`;
        outputChannel.appendLine(message);
        vscode.window.showErrorMessage(message);
        return;
    }

    coverageData = coverage.data;

    vscode.window.visibleTextEditors.forEach((e) => {
        applyDecorationsOnTextEditor(e);
    });
}

function buildDecorationOptions(covItem: CoverageItem, ratio: number): vscode.DecorationOptions {
    const coveragePercentage = (ratio * 100).toFixed(2);
    return {
        range: new vscode.Range(
            covItem.startLine,
            covItem.startColumn,
            covItem.endLine,
            covItem.endColumn
        ),
        hoverMessage: new vscode.MarkdownString(
            `${covItem.coverageHits} ${
                covItem.coverageHits > 1 ? 'hits' : 'hit'
            } (${coveragePercentage}%)`
        )
    };
}

function applyDecorationsOnTextEditor(editor: vscode.TextEditor) {
    if (editor.document.fileName in coverageData) {
        const decorationsByIndex: vscode.DecorationOptions[][] = new Array<
            vscode.DecorationOptions[]
        >(decorationTypes.length);
        for (let i = 0; i < decorationTypes.length; i++) {
            decorationsByIndex[i] = [];
        }

        const fnHitsMax = Math.max(
            ...coverageData[editor.document.fileName].map((fnCov) => fnCov.coverageHits)
        );

        coverageData[editor.document.fileName].forEach((fnCov) => {
            const relativeHits = fnHitsMax > 0 ? fnCov.coverageHits / fnHitsMax : 0;
            const decorationIndex = Math.floor((relativeHits * 100) / 25);
            decorationsByIndex[decorationIndex].push(buildDecorationOptions(fnCov, relativeHits));

            const brHitsMax = Math.max(...fnCov.branchRecords.map((brCov) => brCov.coverageHits));

            fnCov.branchRecords.forEach((brCov) => {
                //const relativeHits = fnCov.coverageHits > 0 ? brCov.coverageHits / fnCov.coverageHits : 0;
                const relativeHits = brHitsMax > 0 ? brCov.coverageHits / brHitsMax : 0;
                const decorationIndex = Math.floor((relativeHits * 100) / 25);
                decorationsByIndex[decorationIndex].push(
                    buildDecorationOptions(brCov, relativeHits)
                );
            });

            const modHitsMax = Math.max(...fnCov.modRecords.map((modCov) => modCov.coverageHits));

            fnCov.modRecords.forEach((modCov) => {
                //const relativeHits = fnCov.coverageHits > 0 ? modCov.coverageHits / fnCov.coverageHits : 0;
                const relativeHits = modHitsMax > 0 ? modCov.coverageHits / modHitsMax : 0;
                const decorationIndex = Math.floor((relativeHits * 100) / 25);
                decorationsByIndex[decorationIndex].push(
                    buildDecorationOptions(modCov, relativeHits)
                );
            });
        });

        for (let i = 0; i < decorationTypes.length; i++) {
            editor.setDecorations(decorationTypes[i], decorationsByIndex[i]);
        }
    }
}
