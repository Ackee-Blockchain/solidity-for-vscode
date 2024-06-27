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
    WakeFunctionCallRequestParams,
    FunctionCallPayload,
    WakeGetBalancesRequestParams,
    WakeSetBalancesRequestParams,
    DeploymentStateData
} from './webview/shared/types';
import { LanguageClient } from 'vscode-languageclient/node';
import { parseCompilationResult } from './utils/compilation';
import { call, compile, deploy, getAccounts, getBalances, setBalances } from './api';
import { AccountState } from './state/AccountState';
import { SakeOutputTreeProvider } from './providers/OutputTreeProvider';
import { TxHistoryState } from './state/TxHistoryState';
import { showTxFromHistory } from './utils/output';
import { copyToClipboardHandler } from '../commands';

export function activateSake(context: vscode.ExtensionContext, client: LanguageClient | undefined) {
    // const sidebarCompilerProvider = new CompilerWebviewProvider(context.extensionUri);

    // context.subscriptions.push(
    //     vscode.window.registerWebviewViewProvider(
    //     "sake-compile-deploy",
    //     sidebarCompilerProvider
    //     )
    // );

    // const sakeOutputChannel = vscode.window.createOutputChannel("Sake", "tools-for-solidity-sake-output");
    const sakeOutputProvider = new SakeOutputTreeProvider(context);
    context.subscriptions.push(
        vscode.window.registerTreeDataProvider('sake-output', sakeOutputProvider)
    );

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

    context.subscriptions.push(
        vscode.commands.registerCommand('sake.refresh', async () => {
            // TODO: change helloworld to sake
            // HelloWorldPanel.kill();
            // HelloWorldPanel.createOrShow(context.extensionUri);
        })
    );

    // @todo remove
    context.subscriptions.push(
        vscode.commands.registerCommand('sake.sampleDeploy', async () => {
            const sampleContractAbi = await loadSampleAbi();
            const sampleContract: DeploymentStateData = {
                name: 'SampleContract',
                balance: undefined, // had to add this
                address: '0x5B38Da6a701c568545dCfcB03FcB875f56beddC4',
                abi: sampleContractAbi,
                nick: undefined
            };
            deploymentState.deploy(sampleContract);
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('sake.test', async () => {
            vscode.window.showInformationMessage('Hello World from Sake!');
        })
    );

    // register status bar
    const statusBarEnvironmentProvider = new StatusBarEnvironmentProvider();
    context.subscriptions.push(statusBarEnvironmentProvider.registerCommand());
    context.subscriptions.push(statusBarEnvironmentProvider.getStatusBarItem());

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
    context.subscriptions.push(
        vscode.commands.registerCommand('sake.getSampleContract', async () => {
            const sampleContractAbi = await loadSampleAbi();
            return sampleContractAbi;
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('Tools-for-Solidity.sake.compile', () => compile(client))
    );

    context.subscriptions.push(
        vscode.commands.registerCommand(
            'Tools-for-Solidity.sake.deploy',
            (params: WakeDeploymentRequestParams) => deploy(params, client, sakeOutputProvider)
        )
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('Tools-for-Solidity.sake.getAccounts', () =>
            getAccounts(client)
        )
    );

    context.subscriptions.push(
        vscode.commands.registerCommand(
            'Tools-for-Solidity.sake.call',
            (params: FunctionCallPayload) => call(params, client, sakeOutputProvider)
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

    vscode.workspace.onDidChangeTextDocument((e) => {
        if (e.document.languageId == 'solidity' && !e.document.isDirty) {
            console.log('.sol file changed, set compilation state dirty');
            compilationState.makeDirty();
        }
        // TODO might need to rework using vscode.workspace.createFileSystemWatcher
    });
}

export function deactivateSake() {}
