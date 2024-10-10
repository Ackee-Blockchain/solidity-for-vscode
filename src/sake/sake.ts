import * as vscode from 'vscode';
import {
    DeployWebviewProvider,
    CompilerWebviewProvider,
    RunWebviewProvider,
    SakeWebviewProvider
} from './providers/WebviewProviders';
import { StatusBarEnvironmentProvider } from './providers/StatusBarEnvironmentProvider';
import { copyToClipboard, loadSampleAbi, getTextFromInputBox } from './commands';
import { DeploymentState } from './state/DeploymentState';
import { CompilationState } from './state/CompilationState';
import {
    WakeCompilationResponse,
    Contract,
    WakeDeploymentRequestParams,
    WakeCallRequestParams,
    CallPayload,
    WakeGetBalancesRequestParams,
    WakeSetBalancesRequestParams,
    DeploymentStateData,
    WakeSetLabelRequestParams
} from './webview/shared/types';
import { LanguageClient, State } from 'vscode-languageclient/node';
import { parseCompiledContracts } from './utils/compilation';
import { call, compile, deploy, getAccounts, getBalances, setBalances, setLabel } from './api';
import { AccountState } from './state/AccountState';
import {
    OutputViewManager,
    SakeOutputItem,
    SakeOutputTreeProvider
} from './providers/OutputTreeProvider';
import { TxHistoryState } from './state/TxHistoryState';
import { showTxFromHistory } from './utils/output';
import { copyToClipboardHandler } from '../commands';
import { WakeState } from './state/WakeState';

export function activateSake(context: vscode.ExtensionContext, client: LanguageClient | undefined) {
    // const sakeOutputChannel = vscode.window.createOutputChannel("Sake", "tools-for-solidity-sake-output");
    const sakeOutputProvider = new SakeOutputTreeProvider(context);
    const treeView = vscode.window.createTreeView('sake-output', {
        treeDataProvider: sakeOutputProvider
    });
    // context.subscriptions.push(
    //     vscode.window.registerTreeDataProvider('sake-output', sakeOutputProvider)
    // );

    const outputViewManager = new OutputViewManager(sakeOutputProvider, treeView);

    // const sidebarDeployProvider = new DeployWebviewProvider(context.extensionUri);
    // context.subscriptions.push(
    //     vscode.window.registerWebviewViewProvider('sake-compile-deploy', sidebarDeployProvider)
    // );

    // const sidebarRunProvider = new RunWebviewProvider(context.extensionUri);
    // context.subscriptions.push(
    //     vscode.window.registerWebviewViewProvider('sake-run', sidebarRunProvider)
    // );

    const sidebarSakeProvider = new SakeWebviewProvider(context.extensionUri);
    context.subscriptions.push(
        vscode.window.registerWebviewViewProvider('sake', sidebarSakeProvider)
    );

    const deploymentState = DeploymentState.getInstance();
    const compilationState = CompilationState.getInstance();
    const accountState = AccountState.getInstance();
    const txHistoryState = TxHistoryState.getInstance();
    const wakeState = WakeState.getInstance();

    console.log('sake', wakeState);

    const workspaceWatcher = () => {
        const workspaces = vscode.workspace.workspaceFolders;
        console.log('workspaceWatcher', workspaces?.length);
        if (workspaces === undefined || workspaces.length === 0) {
            console.log('workspaceWatcher', 'closed');
            wakeState.setIsOpenWorkspace('closed');
            return;
        } else if (workspaces.length > 1) {
            console.log('workspaceWatcher', 'tooManyWorkspaces');
            wakeState.setIsOpenWorkspace('tooManyWorkspaces');
            return;
        }

        console.log('workspaceWatcher', 'open');
        wakeState.setIsOpenWorkspace('open');
    };

    // check if workspace is open
    vscode.workspace.onDidChangeWorkspaceFolders(() => {
        workspaceWatcher();
    });

    workspaceWatcher();

    context.subscriptions.push(
        vscode.commands.registerCommand('sake.refresh', async () => {
            // TODO: change helloworld to sake
            // HelloWorldPanel.kill();
            // HelloWorldPanel.createOrShow(context.extensionUri);
        })
    );

    // // register status bar
    // const statusBarEnvironmentProvider = new StatusBarEnvironmentProvider();
    // context.subscriptions.push(statusBarEnvironmentProvider.registerCommand());
    // context.subscriptions.push(statusBarEnvironmentProvider.getStatusBarItem());

    // register commands
    context.subscriptions.push(
        vscode.commands.registerCommand(
            'sake.copyToClipboard',
            async (text: string) => await copyToClipboardHandler(text)
        )
    );
    context.subscriptions.push(
        vscode.commands.registerCommand(
            'sake.getTextFromInputBox',
            async (initialValue: string) => await getTextFromInputBox(initialValue)
        )
    );
    context.subscriptions.push(
        vscode.commands.registerCommand('sake.getCurrentFile', async () => {
            const editor = vscode.window.activeTextEditor;
            if (!editor) {
                await vscode.window.showErrorMessage('No active editor found.');
                return;
            }
            const document = editor.document;
            const selection = editor.selection;
            const text = document.getText(selection);
            await vscode.window.showInformationMessage(text);
        })
    );
    // context.subscriptions.push(
    //     vscode.commands.registerCommand('sake.getSampleContract', async () => {
    //         const sampleContractAbi = await loadSampleAbi();
    //         return sampleContractAbi;
    //     })
    // );

    context.subscriptions.push(
        vscode.commands.registerCommand('Tools-for-Solidity.sake.compile', () => compile(client))
    );

    context.subscriptions.push(
        vscode.commands.registerCommand(
            'Tools-for-Solidity.sake.deploy',
            (params: WakeDeploymentRequestParams) => deploy(params, client, outputViewManager)
        )
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('Tools-for-Solidity.sake.getAccounts', () =>
            getAccounts(client)
        )
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('Tools-for-Solidity.sake.call', (params: CallPayload) =>
            call(params, client, outputViewManager)
        )
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('Tools-for-Solidity.sake.show_history', () =>
            showTxFromHistory(sakeOutputProvider)
        )
    );

    context.subscriptions.push(
        vscode.commands.registerCommand(
            'Tools-for-Solidity.sake.setBalances',
            (params: WakeSetBalancesRequestParams) => setBalances(params, client)
        )
    );

    context.subscriptions.push(
        vscode.commands.registerCommand(
            'Tools-for-Solidity.sake.getBalances',
            (params: WakeGetBalancesRequestParams) => getBalances(params, client)
        )
    );

    context.subscriptions.push(
        vscode.commands.registerCommand(
            'Tools-for-Solidity.sake.setLabel',
            (params: WakeSetLabelRequestParams) => setLabel(params, client)
        )
    );

    context.subscriptions.push(
        vscode.commands.registerCommand(
            'Tools-for-Solidity.sake.copyFromResults',
            (context: SakeOutputItem) => copyToClipboard(context.value)
        )
    );

    vscode.workspace.onDidChangeTextDocument((e) => {
        if (e.document.languageId == 'solidity' && !e.document.isDirty) {
            console.log('.sol file changed, set compilation state dirty');
            compilationState.makeDirty();
        }
        // TODO might need to rework using vscode.workspace.createFileSystemWatcher
    });
}

export function deactivateSake() {}
