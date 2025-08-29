// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import * as net from 'net';
import { analytics, Analytics, EventType } from './Analytics';
import * as path from 'path';
import * as os from 'os';
const fs = require('fs');

import {
    LanguageClient,
    LanguageClientOptions,
    ServerOptions,
    StreamInfo,
    integer,
    Diagnostic,
    ShowMessageNotification,
    MessageType,
    LogMessageNotification
} from 'vscode-languageclient/node';
import { Graphviz } from '@hpcc-js/wasm';

import {
    importFoundryRemappings,
    copyToClipboardHandler,
    generateCfgHandler,
    generateInheritanceGraphHandler,
    generateLinearizedInheritanceGraphHandler,
    generateImportsGraphHandler,
    executeReferencesHandler,
    newDetector,
    newPrinter
} from './commands';
import { hideCoverageCallback, initCoverage, showCoverageCallback } from './coverage';

import getPort = require('get-port');
import waitPort = require('wait-port');
import { GroupBy, Impact, Confidence } from './detections/WakeTreeDataProvider';
import { SolcTreeDataProvider } from './detections/SolcTreeDataProvider';
import { WakeTreeDataProvider } from './detections/WakeTreeDataProvider';
import { Detector, WakeDetection, WakeDiagnostic } from './detections/model/WakeDetection';
import { convertDiagnostics } from './detections/util';
import { DetectorItem } from './detections/model/DetectorItem';
import { ClientMiddleware } from './ClientMiddleware';
import { ClientErrorHandler } from './ClientErrorHandler';
import { ExecaChildProcess, execa, execaSync } from 'execa';
import { PrintersHandler } from './printers/PrintersHandler';
import { activateSake, deactivateSake } from './sake/sake';
import { GraphvizPreviewGenerator } from './graphviz/GraphvizPreviewGenerator';
import pidtree = require('pidtree');
import { CondaInstaller } from './installers/conda';
import { Installer } from './installers/installerInterface';
import { PipxInstaller } from './installers/pipx';
import { PipInstaller } from './installers/pip';
import { ManualInstaller } from './installers/manual';
import { WakeStatusBarProvider } from './helpers/WakeStatusProvider';
import { PrettierFormatter } from './formatters/PrettierFormatter';

let client: LanguageClient | undefined = undefined;
let wakeProcess: ExecaChildProcess | undefined = undefined;
let wakeProvider: WakeTreeDataProvider | undefined = undefined;
let solcProvider: SolcTreeDataProvider | undefined = undefined;
let diagnosticCollection: vscode.DiagnosticCollection;
let errorHandler: ClientErrorHandler;
let printers: PrintersHandler;
let crashlog: string[] = [];
let graphvizGenerator: GraphvizPreviewGenerator;
let showIgnoredDetections = false;
let extensionContext: vscode.ExtensionContext;

//export let log: Log

const CRASHLOG_LIMIT = 1000;

interface DiagnosticNotification {
    uri: string;
    diagnostics: Diagnostic[];
}

// Store all diagnostics globally so we can refresh visibility
let allDiagnosticsMap: Map<string, WakeDiagnostic[]> = new Map();

function onNotification(outputChannel: vscode.OutputChannel, detection: DiagnosticNotification) {
    let diags = detection.diagnostics.map((it) => convertDiagnostics(it));

    // Store all diagnostics for later filtering
    allDiagnosticsMap.set(detection.uri, diags);

    // Store filtered diagnostics for VS Code diagnostics panel
    let visibleDiags = diags.filter((item) => showIgnoredDetections || !item.data.ignored);
    diagnosticCollection.set(vscode.Uri.parse(detection.uri), visibleDiags);

    try {
        let uri = vscode.Uri.parse(detection.uri);
        // Pass all detections to providers (including ignored ones)
        let wakeDetections = diags
            .filter((item) => item.source === 'Wake')
            .map((it) => new WakeDetection(uri, it));
        wakeProvider?.add(uri, wakeDetections);
        let solcDetections = diags
            .filter((item) => item.source === 'Wake(solc)')
            .map((it) => new WakeDetection(uri, it));
        solcProvider?.add(uri, solcDetections);
    } catch (err) {
        if (err instanceof Error) {
            outputChannel.appendLine(err.toString());
        }
    }
}

function refreshDiagnosticsVisibility() {
    // Re-filter all stored diagnostics based on current showIgnoredDetections state
    for (const [uri, diags] of allDiagnosticsMap) {
        let visibleDiags = diags.filter((item) => showIgnoredDetections || !item.data.ignored);
        diagnosticCollection.set(vscode.Uri.parse(uri), visibleDiags);
    }
}

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export async function activate(context: vscode.ExtensionContext) {
    extensionContext = context;
    const outputChannel = vscode.window.createOutputChannel(
        'Solidity: Output',
        'tools-for-solidity-output'
    );
    const extensionConfig: vscode.WorkspaceConfiguration =
        vscode.workspace.getConfiguration('Tools-for-Solidity');

    let wakePort: number | undefined = extensionConfig.get('Wake.port', undefined);
    let pathToExecutable: string | null = extensionConfig.get<string | null>(
        'Wake.pathToExecutable',
        null
    );
    if (pathToExecutable?.trim()?.length === 0) {
        pathToExecutable = null;
    }
    let installationMethod: string = extensionConfig.get<string>(
        'Wake.installationMethod',
        'conda'
    );
    let prerelease: boolean = extensionConfig.get<boolean>('Wake.prerelease', false);

    let method = '';
    if (wakePort) {
        method = 'port';
    } else if (pathToExecutable !== null) {
        method = 'path';
    } else if (installationMethod === 'conda') {
        method = 'conda';
    } else if (installationMethod === 'pipx') {
        method = 'pipx';
    } else if (installationMethod === 'pip') {
        method = 'pip';
    } else if (installationMethod === 'manual') {
        method = 'manual';
    } else {
        throw new Error(`Unknown installation method: ${installationMethod}`);
    }

    analytics.initialize(context, method);
    errorHandler = new ClientErrorHandler(outputChannel, analytics);

    migrateConfig();

    let solcIgnoredWarnings = extensionConfig.get<Array<integer | string>>(
        'Wake.compiler.solc.ignoredWarnings',
        []
    );

    let folders: string[] = vscode.workspace.getConfiguration('python').get('venvFolders', []);
    let relativeGlobalStorage = path.relative(os.homedir(), context.globalStorageUri.fsPath);

    if (!folders.includes(relativeGlobalStorage)) {
        vscode.workspace
            .getConfiguration('python')
            .update(
                'venvFolders',
                folders.concat(relativeGlobalStorage),
                vscode.ConfigurationTarget.Global
            );
    }

    registerCommands(outputChannel, context);

    if (!wakePort) {
        let installer: Installer;

        if (method === 'conda') {
            installer = new CondaInstaller(context, outputChannel, analytics, prerelease);
        } else if (method === 'pipx') {
            installer = new PipxInstaller(context, outputChannel, analytics, prerelease);
        } else if (method === 'pip') {
            installer = new PipInstaller(
                context,
                outputChannel,
                analytics,
                pathToExecutable,
                prerelease
            );
        } else {
            installer = new ManualInstaller(context, outputChannel, analytics, pathToExecutable);
        }

        await installer.setup();

        wakePort = await getPort();
        wakeProcess = installer.startWake(wakePort);

        wakeProcess.stderr?.on('data', (chunk) => {
            crashlog.push(chunk);
            if (crashlog.length > CRASHLOG_LIMIT) {
                crashlog.shift();
            }
        });
        wakeProcess.on('error', (error) => {
            if (error) {
                outputChannel.appendLine(error.message);
                outputChannel.show(true);
                throw error;
            }
        });
        wakeProcess.on('close', () => {
            analytics.logCrash(EventType.ERROR_WAKE_CRASH, new Error(crashlog.join('\n')));
            printCrashlog(outputChannel);
            outputChannel.show(true);
            wakeProcess = undefined;
        });
    } else {
        outputChannel.appendLine(`Connecting to running 'wake' server on port ${wakePort}`);
    }

    if (
        !(await waitPort({
            host: '127.0.0.1',
            port: wakePort,
            timeout: 15000
        }))
    ) {
        outputChannel.appendLine(`Timed out waiting for port ${wakePort} to open.`);
        outputChannel.show(true);
    }

    const serverOptions: ServerOptions = async () => {
        let socket = net.connect({
            port: wakePort ?? 65432,
            host: '127.0.0.1'
        });
        let result: StreamInfo = {
            writer: socket,
            reader: socket
        };
        return result;
    };
    wakeProvider = new WakeTreeDataProvider(context);
    solcProvider = new SolcTreeDataProvider(context);

    // Initialize showIgnoredDetections from workspace state (already loaded by WakeTreeDataProvider)
    showIgnoredDetections = context.workspaceState.get('detections.showIgnored', false);

    const clientOptions: LanguageClientOptions = {
        documentSelector: [{ scheme: 'file', language: 'solidity' }],
        synchronize: { configurationSection: 'wake' },
        outputChannel: outputChannel,
        initializationOptions: {
            toolsForSolidityVersion: context.extension.packageJSON.version
        },
        middleware: new ClientMiddleware(outputChannel),
        errorHandler: errorHandler
    };

    client = new LanguageClient(
        'Tools-for-Solidity',
        'Tools for Solidity',
        serverOptions,
        clientOptions
    );
    errorHandler.setClient(client);

    const graphviz = await Graphviz.load();
    graphvizGenerator = new GraphvizPreviewGenerator(context, graphviz);
    printers = new PrintersHandler(client, context, graphvizGenerator, outputChannel);

    diagnosticCollection = vscode.languages.createDiagnosticCollection('Wake');

    client.onNotification('textDocument/publishDiagnostics', (params) => {
        //outputChannel.appendLine(JSON.stringify(params));
        let diag = params as DiagnosticNotification;

        // Do not show ignored warnings
        diag.diagnostics = diag.diagnostics.filter((item) => {
            if (
                item.code &&
                item.source === 'Wake(solc)' &&
                solcIgnoredWarnings.includes(Number.parseInt(item.code as string))
            ) {
                return false;
            }
            return true;
        });
        onNotification(outputChannel, diag);
    });
    client.onNotification(ShowMessageNotification.type, (message) => {
        switch (message.type) {
            case MessageType.Error:
                analytics.logCrash(
                    EventType.ERROR_WAKE_SERVER_SHOW_MESSAGE_ERROR,
                    new Error(message.message)
                );
                vscode.window.showErrorMessage(message.message);
                break;
            case MessageType.Warning:
                vscode.window.showWarningMessage(message.message);
                break;
            case MessageType.Info:
                vscode.window.showInformationMessage(message.message);
                break;
            default:
                vscode.window.showInformationMessage(message.message);
        }
    });
    client.onNotification(LogMessageNotification.type, (message) => {
        switch (message.type) {
            case MessageType.Error:
                analytics.logCrash(
                    EventType.ERROR_WAKE_SERVER_LOG_MESSAGE_ERROR,
                    new Error(message.message)
                );
                client?.error(message.message, undefined, false);
                break;
            case MessageType.Warning:
                client?.warn(message.message, undefined, false);
                break;
            case MessageType.Info:
                client?.info(message.message, undefined, false);
                break;
            default:
                client?.outputChannel.appendLine(message.message);
        }
    });

    vscode.window.registerTreeDataProvider('wake-detections', wakeProvider);
    vscode.window.registerTreeDataProvider('solc-detections', solcProvider);

    initCoverage(outputChannel);

    client.start();

    // Create the Wake status bar item
    const statusBarProvider = new WakeStatusBarProvider(client, analytics);

    analytics.logActivate();

    // force show walkthrough on new release
    const shownWalkthrough = context.globalState.get('tools-for-solidity.force-shown-walkthrough');
    if (!shownWalkthrough) {
        // Set the flag in globalState
        await context.globalState.update('tools-for-solidity.force-shown-walkthrough', true);
        vscode.commands.executeCommand('Tools-for-Solidity.open_walkthrough');
    }

    // register formatter
    registerFormatter(context);

    // activate Sake
    activateSake(context, client);

    // check for foundry remappings
    watchFoundryRemappings();
}

function registerCommands(outputChannel: vscode.OutputChannel, context: vscode.ExtensionContext) {
    context.subscriptions.push(
        vscode.commands.registerCommand(
            'Tools-for-Solidity.generate.control_flow_graph',
            async (documentUri, canonicalName) =>
                await generateCfgHandler(
                    outputChannel,
                    documentUri,
                    canonicalName,
                    graphvizGenerator
                )
        )
    );
    context.subscriptions.push(
        vscode.commands.registerCommand(
            'Tools-for-Solidity.generate.inheritance_graph',
            async (documentUri, canonicalName) =>
                await generateInheritanceGraphHandler({
                    documentUri,
                    canonicalName,
                    out: outputChannel,
                    graphviz: graphvizGenerator
                })
        )
    );
    context.subscriptions.push(
        vscode.commands.registerCommand(
            'Tools-for-Solidity.generate.linearized_inheritance_graph',
            async (documentUri, canonicalName) =>
                await generateLinearizedInheritanceGraphHandler(
                    outputChannel,
                    documentUri,
                    canonicalName,
                    graphvizGenerator
                )
        )
    );
    context.subscriptions.push(
        vscode.commands.registerCommand(
            'Tools-for-Solidity.copy_to_clipboard',
            async (text) => await copyToClipboardHandler(text)
        )
    );
    context.subscriptions.push(
        vscode.commands.registerCommand(
            'Tools-for-Solidity.foundry.import_remappings',
            async () => await importFoundryRemappings(outputChannel)
        )
    );
    context.subscriptions.push(
        vscode.commands.registerCommand(
            'Tools-for-Solidity.foundry.import_remappings_silent',
            async () => await importFoundryRemappings(outputChannel, true)
        )
    );
    context.subscriptions.push(
        vscode.commands.registerCommand(
            'Tools-for-Solidity.generate.imports_graph',
            async () => await generateImportsGraphHandler(outputChannel, graphvizGenerator)
        )
    );
    context.subscriptions.push(
        vscode.commands.registerCommand(
            'Tools-for-Solidity.execute.references',
            async (documentUri, position, declarationPositions) =>
                await executeReferencesHandler(
                    outputChannel,
                    documentUri,
                    position,
                    declarationPositions
                )
        )
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('Tools-for-Solidity.coverage.show', showCoverageCallback)
    );
    context.subscriptions.push(
        vscode.commands.registerCommand('Tools-for-Solidity.coverage.hide', hideCoverageCallback)
    );

    context.subscriptions.push(
        vscode.commands.registerCommand(
            'Tools-for-Solidity.detections.open_file',
            async (uri, range) => openFile(uri, range)
        )
    );
    context.subscriptions.push(
        vscode.commands.registerCommand('Tools-for-Solidity.detections.open_docs', async (item) =>
            openWeb((item as DetectorItem).detector)
        )
    );

    context.subscriptions.push(
        vscode.commands.registerCommand(
            'Tools-for-Solidity.init.detector',
            async () => await newDetector(false)
        )
    );
    context.subscriptions.push(
        vscode.commands.registerCommand(
            'Tools-for-Solidity.init.global_detector',
            async () => await newDetector(true)
        )
    );
    context.subscriptions.push(
        vscode.commands.registerCommand(
            'Tools-for-Solidity.init.printer',
            async () => await newPrinter(false)
        )
    );
    context.subscriptions.push(
        vscode.commands.registerCommand(
            'Tools-for-Solidity.init.global_printer',
            async () => await newPrinter(true)
        )
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('Tools-for-Solidity.detections.group.impact', async () =>
            wakeProvider?.setGroupBy(GroupBy.IMPACT)
        )
    );
    context.subscriptions.push(
        vscode.commands.registerCommand('Tools-for-Solidity.detections.group.file', async () =>
            wakeProvider?.setGroupBy(GroupBy.FILE)
        )
    );
    context.subscriptions.push(
        vscode.commands.registerCommand(
            'Tools-for-Solidity.detections.group.confidence',
            async () => wakeProvider?.setGroupBy(GroupBy.CONFIDENCE)
        )
    );
    context.subscriptions.push(
        vscode.commands.registerCommand('Tools-for-Solidity.detections.group.detector', async () =>
            wakeProvider?.setGroupBy(GroupBy.DETECTOR)
        )
    );

    context.subscriptions.push(
        vscode.commands.registerCommand(
            'Tools-for-Solidity.detections.filter.impact.high',
            async () => wakeProvider?.setFilterImpact(Impact.HIGH)
        )
    );
    context.subscriptions.push(
        vscode.commands.registerCommand(
            'Tools-for-Solidity.detections.filter.impact.medium',
            async () => wakeProvider?.setFilterImpact(Impact.MEDIUM)
        )
    );
    context.subscriptions.push(
        vscode.commands.registerCommand(
            'Tools-for-Solidity.detections.filter.impact.low',
            async () => wakeProvider?.setFilterImpact(Impact.LOW)
        )
    );
    context.subscriptions.push(
        vscode.commands.registerCommand(
            'Tools-for-Solidity.detections.filter.impact.warning',
            async () => wakeProvider?.setFilterImpact(Impact.WARNING)
        )
    );
    context.subscriptions.push(
        vscode.commands.registerCommand(
            'Tools-for-Solidity.detections.filter.impact.info',
            async () => wakeProvider?.setFilterImpact(Impact.INFO)
        )
    );

    context.subscriptions.push(
        vscode.commands.registerCommand(
            'Tools-for-Solidity.detections.filter.confidence.high',
            async () => wakeProvider?.setFilterConfidence(Confidence.HIGH)
        )
    );
    context.subscriptions.push(
        vscode.commands.registerCommand(
            'Tools-for-Solidity.detections.filter.confidence.medium',
            async () => wakeProvider?.setFilterConfidence(Confidence.MEDIUM)
        )
    );
    context.subscriptions.push(
        vscode.commands.registerCommand(
            'Tools-for-Solidity.detections.filter.confidence.low',
            async () => wakeProvider?.setFilterConfidence(Confidence.LOW)
        )
    );

    context.subscriptions.push(
        vscode.commands.registerCommand(
            'Tools-for-Solidity.detections.force_rerun_detectors',
            async () => {
                wakeProvider?.clear();
                allDiagnosticsMap.clear();
                vscode.commands.executeCommand('wake.lsp.force_rerun_detectors');
            }
        )
    );
    context.subscriptions.push(
        vscode.commands.registerCommand(
            'Tools-for-Solidity.detections.force_recompile',
            async () => {
                solcProvider?.clear();
                wakeProvider?.clear();
                allDiagnosticsMap.clear();
                vscode.commands.executeCommand('wake.lsp.force_recompile');
            }
        )
    );

    context.subscriptions.push(
        vscode.commands.registerCommand(
            'Tools-for-Solidity.wake_callback',
            async (documentUri: vscode.Uri, callbackType: string, callbackId: string) =>
                await vscode.commands.executeCommand(
                    'wake.callback',
                    documentUri,
                    callbackType,
                    callbackId
                )
        )
    );

    context.subscriptions.push(
        vscode.commands.registerCommand(
            'Tools-for-Solidity.select-installation-method',
            async () => {
                const items: any[] = [
                    { label: 'Install Wake using conda', setting: 'conda' },
                    { label: 'Install Wake using pip', setting: 'pip' },
                    { label: 'Install Wake using pipx', setting: 'pipx' },
                    { label: 'Manual install', setting: 'manual' }
                ];
                const selection = await vscode.window.showQuickPick(items, {
                    title: 'Select the installation method for Wake'
                });

                if (selection) {
                    const cfg = vscode.workspace.getConfiguration('Tools-for-Solidity');
                    cfg.update(
                        'Wake.installationMethod',
                        selection.setting,
                        vscode.ConfigurationTarget.Global
                    );
                    console.log(`Selected installation method: ${selection.setting}`);
                }
            }
        )
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('Tools-for-Solidity.send-rosetta-command', async () => {
            // command
            const command = ';softwareupdate --install-rosetta --agree-to-license;';
            // open terminal
            let terminal = vscode.window.createTerminal('rosetta');
            terminal.sendText(command, false);
            terminal.show();
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('Tools-for-Solidity.install.wake-conda', async () =>
            vscode.window.showInformationMessage('Not implemented yet.')
        )
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('Tools-for-Solidity.config.enable-prerelease', () => {
            const cfg = vscode.workspace.getConfiguration('Tools-for-Solidity');
            cfg.update('Wake.prerelease', true, vscode.ConfigurationTarget.Global);
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand(
            'Tools-for-Solidity.config.disable-prerelease',
            async () => {
                const cfg = vscode.workspace.getConfiguration('Tools-for-Solidity');
                cfg.update('Wake.prerelease', false, vscode.ConfigurationTarget.Global);
            }
        )
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('Tools-for-Solidity.open-detections-ui', async () => {
            vscode.commands.executeCommand('workbench.view.extension.tools-for-solidity');
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('Tools-for-Solidity.open-sake-ui', async () => {
            vscode.commands.executeCommand('workbench.view.extension.sake');
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('Tools-for-Solidity.open_walkthrough', () => {
            vscode.commands.executeCommand(
                `workbench.action.openWalkthrough`,
                `ackeeblockchain.tools-for-solidity#tfs-walkthrough`,
                false
            );
        })
    );

    // Register commands for toggling ignored detections
    context.subscriptions.push(
        vscode.commands.registerCommand('Tools-for-Solidity.detections.toggle_show_ignored', () => {
            showIgnoredDetections = true;
            vscode.commands.executeCommand('setContext', 'wake.detections.showIgnored', true);

            // Update tree provider (which also saves to workspaceState)
            wakeProvider?.setShowIgnored(true);

            // Refresh diagnostics panel by re-processing existing detections
            refreshDiagnosticsVisibility();
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('Tools-for-Solidity.detections.toggle_hide_ignored', () => {
            showIgnoredDetections = false;
            vscode.commands.executeCommand('setContext', 'wake.detections.showIgnored', false);

            // Update tree provider (which also saves to workspaceState)
            wakeProvider?.setShowIgnored(false);

            // Refresh diagnostics panel by re-processing existing detections
            refreshDiagnosticsVisibility();
        })
    );
}

function registerFormatter(context: vscode.ExtensionContext) {
    context.subscriptions.push(
        vscode.languages.registerDocumentFormattingEditProvider('solidity', new PrettierFormatter())
    );
}

function watchFoundryRemappings() {
    const workspaces = vscode.workspace.workspaceFolders;
    if (workspaces === undefined || workspaces.length > 1) {
        return;
    }

    const workspace = workspaces[0];
    const fileWatcher = vscode.workspace.createFileSystemWatcher(
        new vscode.RelativePattern(workspace, '.gitmodules')
    );

    let configWatcher: vscode.Disposable;

    // listen to config changes
    configWatcher = vscode.workspace.onDidChangeConfiguration((event) => {
        if (
            event.affectsConfiguration(
                'Tools-for-Solidity.wake.configuration.autoimport_remappings'
            )
        ) {
            // get value
            const autoImportRemappings = vscode.workspace
                .getConfiguration('Tools-for-Solidity')
                .get<boolean>('wake.configuration.autoimport_remappings');

            if (autoImportRemappings === undefined) {
                return;
            }

            fileWatcher.dispose();
            if (autoImportRemappings) {
                configWatcher.dispose();
                watchFoundryRemappings();
            }
        }
    });

    const cfg = vscode.workspace.getConfiguration('Tools-for-Solidity');
    const autoImportRemappings = cfg.get<boolean>('wake.configuration.autoimport_remappings');

    if (autoImportRemappings !== undefined && !autoImportRemappings) {
        return;
    }

    // Check if this is a Foundry project by looking for .gitmodules or foundry.toml
    // const gitmodulesPath = path.join(workspace.uri.fsPath, '.gitmodules');
    // const foundryTomlPath = path.join(workspace.uri.fsPath, 'foundry.toml');

    // if (!fs.existsSync(gitmodulesPath) && !fs.existsSync(foundryTomlPath)) {
    //     return;
    // }

    // start file system watcher
    fileWatcher.onDidChange(async () => {
        vscode.commands.executeCommand('Tools-for-Solidity.foundry.import_remappings_silent');
    });
    fileWatcher.onDidCreate(async () => {
        vscode.commands.executeCommand('Tools-for-Solidity.foundry.import_remappings_silent');
    });
    fileWatcher.onDidDelete(async () => {
        // When .gitmodules is deleted, clear remappings since dependencies are gone
        vscode.workspace
            .getConfiguration('wake.compiler.solc')
            .update('remappings', undefined, vscode.ConfigurationTarget.Workspace);
    });

    vscode.commands.executeCommand('Tools-for-Solidity.foundry.import_remappings_silent');
}

function openFile(uri: vscode.Uri, range: vscode.Range) {
    vscode.workspace.openTextDocument(uri).then((file) => {
        vscode.window.showTextDocument(file).then(async (editor) => {
            if (vscode.window.activeTextEditor) {
                const target = new vscode.Selection(
                    range.start.line,
                    range.start.character,
                    range.end.line,
                    range.end.character
                );
                vscode.window.activeTextEditor.selection = target;
                vscode.window.activeTextEditor.revealRange(
                    target,
                    vscode.TextEditorRevealType.InCenter
                );
            }
        });
    });
}

function openWeb(detector: Detector) {
    if (detector.docs != undefined) {
        vscode.env.openExternal(detector.docs);
        //let panel = vscode.window.createWebviewPanel('detector-docs', "Detector Documentation (" + detector.id + ")", vscode.ViewColumn.Beside);
        //panel.webview.html = `<html><body>TODO</body></html>`;
    }
}

// this method is called when your extension is deactivated
export async function deactivate() {
    if (client !== undefined) {
        client.stop();
    }
    if (wakeProcess?.pid !== undefined) {
        const pids = await pidtree(wakeProcess.pid);
        pids.forEach((pid: number) => {
            try {
                process.kill(pid, 'SIGTERM');
            } catch (err) {
                console.error(err);
            }
        });
        await new Promise((resolve) => setTimeout(resolve, 1000));

        pids.forEach((pid: number) => {
            try {
                if (process.platform === 'win32') {
                    execaSync('taskkill', ['/pid', pid.toString(), '/f', '/t']);
                } else {
                    process.kill(pid, 'SIGKILL');
                }
            } catch (err) {
                console.error(err);
            }
        });
    }
    deactivateSake();
}

function migrateConfig() {
    if (vscode.workspace.getConfiguration('Tools-for-Solidity').has('Woke')) {
        analytics.logMigrate();
        let cfg: vscode.WorkspaceConfiguration =
            vscode.workspace.getConfiguration('Tools-for-Solidity');
        migrateConfigKey(cfg, cfg, 'Woke.trace.server', 'Wake.trace.server');
        migrateConfigKey(cfg, cfg, 'Woke.autoInstall', 'Wake.autoInstall');
        migrateConfigKey(cfg, cfg, 'Woke.pathToExecutable', 'Wake.pathToExecutable');
        migrateConfigKey(cfg, cfg, 'Woke.port', 'Wake.port');
    }

    if (vscode.workspace.getConfiguration().has('woke')) {
        let wokeCfg: vscode.WorkspaceConfiguration = vscode.workspace.getConfiguration('woke');
        let wakeCfg: vscode.WorkspaceConfiguration = vscode.workspace.getConfiguration('wake');

        migrateConfigKey(wokeCfg, wakeCfg, 'configuration.use_toml_if_present');
        migrateConfigKey(wokeCfg, wakeCfg, 'configuration.toml_path');

        migrateConfigKey(wokeCfg, wakeCfg, 'compiler.solc.allow_paths');
        migrateConfigKey(wokeCfg, wakeCfg, 'compiler.solc.evm_version');
        migrateConfigKey(
            wokeCfg,
            wakeCfg,
            'compiler.solc.ignore_paths',
            'compiler.solc.exclude_paths'
        );
        migrateConfigKey(wokeCfg, wakeCfg, 'compiler.solc.include_paths');
        migrateConfigKey(wokeCfg, wakeCfg, 'compiler.solc.remappings');
        migrateConfigKey(wokeCfg, wakeCfg, 'compiler.solc.target_version');
        migrateConfigKey(wokeCfg, wakeCfg, 'compiler.solc.via_IR');
        migrateConfigKey(wokeCfg, wakeCfg, 'compiler.solc.optimizer.enabled');
        migrateConfigKey(wokeCfg, wakeCfg, 'compiler.solc.optimizer.runs');

        migrateConfigKey(wokeCfg, wakeCfg, 'detectors.exclude');
        migrateConfigKey(wokeCfg, wakeCfg, 'detectors.only');
        migrateConfigKey(wokeCfg, wakeCfg, 'detectors.ignore_paths', 'detectors.exclude_paths');

        migrateConfigKey(wokeCfg, wakeCfg, 'generator.control_flow_graph.direction');
        migrateConfigKey(wokeCfg, wakeCfg, 'generator.control_flow_graph.vscode_urls');
        migrateConfigKey(wokeCfg, wakeCfg, 'generator.imports_graph.direction');
        migrateConfigKey(wokeCfg, wakeCfg, 'generator.imports_graph.imports_direction');
        migrateConfigKey(wokeCfg, wakeCfg, 'generator.generator.imports_graph.vscode_urls');
        migrateConfigKey(wokeCfg, wakeCfg, 'generator.inheritance_graph.direction');
        migrateConfigKey(wokeCfg, wakeCfg, 'generator.inheritance_graph.vscode_urls');
        migrateConfigKey(wokeCfg, wakeCfg, 'generator.inheritance_graph_full.direction');
        migrateConfigKey(wokeCfg, wakeCfg, 'generator.inheritance_graph_full.vscode_urls');

        migrateConfigKey(wokeCfg, wakeCfg, 'lsp.compilation_delay');
        migrateConfigKey(wokeCfg, wakeCfg, 'lsp.code_lens.enable');
        migrateConfigKey(wokeCfg, wakeCfg, 'lsp.detectors.enable');
        migrateConfigKey(wokeCfg, wakeCfg, 'lsp.find_references.include_declarations');
    }
}

function migrateConfigKey(
    from: vscode.WorkspaceConfiguration,
    to: vscode.WorkspaceConfiguration,
    fromKey: string,
    toKey?: string | undefined
) {
    let key = toKey == undefined ? fromKey : toKey;
    let value = from.inspect(fromKey);
    if (value?.globalValue != undefined) {
        to.update(key, value?.globalValue, vscode.ConfigurationTarget.Global);
        from.update(fromKey, undefined, vscode.ConfigurationTarget.Global);
    }
    if (value?.workspaceValue != undefined) {
        to.update(key, value?.workspaceValue, vscode.ConfigurationTarget.Workspace);
        from.update(fromKey, undefined, vscode.ConfigurationTarget.Workspace);
    }
}

function printCrashlog(outputChannel: vscode.OutputChannel) {
    outputChannel.appendLine(
        '\n≡W≡W≡W≡[ Wake LSP Crashlog ]≡W≡W≡W≡W≡W≡W≡W≡W≡W≡W≡W≡W≡W≡W≡W≡W≡W≡W≡W≡W≡W≡W≡W≡W≡\n'
    );
    crashlog.forEach((line) => {
        outputChannel.appendLine(line);
    });
    outputChannel.appendLine(
        '\n≡W≡W≡W≡W≡W≡W≡W≡W≡W≡W≡W≡W≡W≡W≡W≡W≡W≡W≡W≡W≡W≡W≡W≡W≡W≡W≡W≡W≡W≡W≡W≡W≡W≡W≡W≡W≡W≡W≡'
    );
    outputChannel.appendLine(
        '|                                                                           |'
    );
    outputChannel.appendLine(
        '|   Ooops! Wake LSP crashed, please report the issue to our GitHub:         |'
    );
    outputChannel.appendLine(
        '|   https://github.com/Ackee-Blockchain/tools-for-solidity-vscode/issues    |'
    );
    outputChannel.appendLine(
        '|                                                                           |'
    );
    outputChannel.appendLine(
        '≡W≡W≡W≡W≡W≡W≡W≡W≡W≡W≡W≡W≡W≡W≡W≡W≡W≡W≡W≡W≡W≡W≡W≡W≡W≡W≡W≡W≡W≡W≡W≡W≡W≡W≡W≡W≡W≡W≡'
    );
}

export class Log {
    outputChannel: vscode.OutputChannel;
    level: integer;

    constructor(outputChannel: vscode.OutputChannel, level: integer) {
        this.outputChannel = outputChannel;
        this.level = level;
    }

    d(message: string) {
        if (this.level >= 0) this.outputChannel.appendLine(message);
    }
}
