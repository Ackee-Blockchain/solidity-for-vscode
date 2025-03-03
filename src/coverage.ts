import * as vscode from 'vscode';
import { compare } from '@renovatebot/pep440';

// Legacy coverage format (version 1.0)
interface LegacyCoverageItem {
    startLine: number;
    startColumn: number;
    endLine: number;
    endColumn: number;
    coverageHits: number;
}

interface LegacyFunctionCoverageItem extends LegacyCoverageItem {
    branchRecords: LegacyCoverageItem[];
    modRecords: LegacyCoverageItem[];
    name: string;
}

interface LegacyCoverageData {
    [path: string]: LegacyFunctionCoverageItem[];
}

interface LegacyCoverageHeader {
    version: string;
    data: LegacyCoverageData;
}

// New coverage format (version 2.0+)
interface CoverageItem {
    startLine: number;
    startColumn: number;
    endLine: number;
    endColumn: number;
    count: number;
}

interface CoverageDetail {
    total: number;
    covered: CoverageItem[];
}

interface FileCoverage {
    declarations: CoverageDetail;
    statements: CoverageDetail;
}

interface CoverageHeader {
    version: string;
    data: { [path: string]: FileCoverage };
}

// Global variables
let legacyCoverageData: LegacyCoverageData | undefined;
const decorationTypes: vscode.TextEditorDecorationType[] = [];
const disposables: { dispose(): any }[] = [];
let windowChangeListener: vscode.Disposable | undefined;
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
            const controller = vscode.tests.createTestController('Wake coverage', 'Coverage');

            // Add controller to disposables so it gets cleaned up properly
            disposables.push(controller);
            disposables.push(fsWatcher);

            fsWatcher.onDidChange((changeUri) => {
                if (changeUri.toString() === uri[0].toString()) {
                    vscode.workspace.fs.readFile(uri[0]).then((data) => {
                        loadCoverage(data, controller);
                    });
                }
            });

            vscode.workspace.fs.readFile(uri[0]).then((data) => {
                loadCoverage(data, controller);
            });
        }
    });
}

export function hideCoverageCallback() {
    // Dispose all disposables (including controller and fsWatcher)
    disposables.forEach((d) => d.dispose());
    disposables.length = 0;

    if (windowChangeListener) {
        windowChangeListener.dispose();
        windowChangeListener = undefined;
    }

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

function loadCoverage(data: Uint8Array, controller: vscode.TestController) {
    clearDecorations();

    const jsonString = Buffer.from(data).toString('utf-8');
    const parsedJson = JSON.parse(jsonString);

    // Check version to determine which format to use
    if (parsedJson.version === "1.0") {
        // Legacy format
        const legacyCoverage = parsedJson as LegacyCoverageHeader;

        if (compare(legacyCoverage.version, '1.0.0') < 0) {
            const message = `Coverage data version ${legacyCoverage.version} is not supported. Please collect new coverage data with up-to-date version of Wake.`;
            outputChannel.appendLine(message);
            vscode.window.showErrorMessage(message);
            return;
        }

        legacyCoverageData = legacyCoverage.data;

        // For legacy format, we need to redraw decorations when editor windows change
        // Remove any existing window change event listener first
        if (windowChangeListener) {
            windowChangeListener.dispose();
        }

        // Add window change event listener for legacy format
        windowChangeListener = vscode.window.onDidChangeVisibleTextEditors((editors) => {
            editors.forEach((e) => {
                applyDecorationsOnTextEditor(e);
            });
        });

        // Apply decorations to currently visible editors
        vscode.window.visibleTextEditors.forEach((e) => {
            applyDecorationsOnTextEditor(e);
        });
    } else {
        // New format (version 2.0+)
        const coverage = parsedJson as CoverageHeader;

        if (compare(coverage.version, '2.0.0') < 0) {
            const message = `Coverage data version ${coverage.version} is not supported. Please update the Solidity extension.`;
            outputChannel.appendLine(message);
            vscode.window.showErrorMessage(message);
            return;
        }

        // For new format, we don't need to redraw decorations when editor windows change
        // Remove any existing window change event listener
        if (windowChangeListener) {
            windowChangeListener.dispose();
            windowChangeListener = undefined;
        }

        const runHandler = (request: vscode.TestRunRequest, token: vscode.CancellationToken) => {
            console.log('runHandler');
        };

        const profile = controller.createRunProfile("Coverage", vscode.TestRunProfileKind.Coverage, runHandler, true, undefined, true);

        // Add profile to disposables for proper cleanup
        disposables.push(profile);

        profile.loadDetailedCoverage = async (testRun: vscode.TestRun, fileCoverage: vscode.FileCoverage, token: vscode.CancellationToken) => {
            const statements = coverage.data[fileCoverage.uri.fsPath].statements.covered.map(element =>
                new vscode.StatementCoverage(
                    element.count,
                    new vscode.Range(
                        new vscode.Position(element.startLine - 1, element.startColumn - 1),
                        new vscode.Position(element.endLine - 1, element.endColumn - 1)
                    )
                )
            );
            return statements;
        };

        const run = controller.createTestRun(
            new vscode.TestRunRequest([], [], profile),
            'Coverage',
            false
        );

        for (const file in coverage.data) {
            run.addCoverage(new vscode.FileCoverage(
                vscode.Uri.file(file),
                new vscode.TestCoverageCount(
                    coverage.data[file].statements.covered.length,
                    coverage.data[file].statements.total
                )
            ));
        }

        run.end();
    }
}

function buildDecorationOptions(covItem: LegacyCoverageItem, ratio: number): vscode.DecorationOptions {
    const coveragePercentage = (ratio * 100).toFixed(2);
    return {
        range: new vscode.Range(
            covItem.startLine,
            covItem.startColumn,
            covItem.endLine,
            covItem.endColumn
        ),
        hoverMessage: new vscode.MarkdownString(
            `${covItem.coverageHits} ${covItem.coverageHits > 1 ? 'hits' : 'hit'
            } (${coveragePercentage}%)`
        )
    };
}

function applyDecorationsOnTextEditor(editor: vscode.TextEditor) {
    if (legacyCoverageData && editor.document.fileName in legacyCoverageData) {
        const decorationsByIndex: vscode.DecorationOptions[][] = new Array<
            vscode.DecorationOptions[]
        >(decorationTypes.length);
        for (let i = 0; i < decorationTypes.length; i++) {
            decorationsByIndex[i] = [];
        }

        const fnHitsMax = Math.max(
            ...legacyCoverageData[editor.document.fileName].map((fnCov) => fnCov.coverageHits)
        );

        legacyCoverageData[editor.document.fileName].forEach((fnCov) => {
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
