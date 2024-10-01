import * as vscode from 'vscode';
import {
    DeployWebviewProvider,
    CompilerWebviewProvider,
    RunWebviewProvider,
    SakeWebviewProvider
} from './providers/WebviewProviders';
import { copyToClipboard, loadSampleAbi, getTextFromInputBox } from './commands';
import {
    WakeCompilationResponse,
    Contract,
    WakeDeploymentRequestParams,
    WakeCallRequestParams,
    CallRequest,
    WakeGetBalancesRequestParams,
    WakeSetBalancesRequestParams,
    WakeSetLabelRequestParams,
    WakeGetBytecodeRequestParams,
    WalletDeploymentData
} from './webview/shared/types';
import { LanguageClient, State } from 'vscode-languageclient/node';
import { parseCompiledContracts } from './utils/compilation';
import { WakeApi } from './api/wake';
import { OutputViewManager, SakeOutputItem } from './providers/OutputTreeProvider';
import { showTxFromHistory } from './utils/output';
import { copyToClipboardHandler } from '../commands';
import { WalletServer } from '../serve';
import { LocalNodeNetworkProvider } from './network/networks';
import { LocalNodeSakeProvider, SakeProviderManager } from './providers/SakeProviders';

export function activateSake(context: vscode.ExtensionContext, client: LanguageClient) {
    // Initialize Wake API
    WakeApi.initialize(client);
    OutputViewManager.initialize(context);
    // const sakeOutputChannel = vscode.window.createOutputChannel("Sake", "tools-for-solidity-sake-output");
    // context.subscriptions.push(
    //     vscode.window.registerTreeDataProvider('sake-output', sakeOutputProvider)
    // );

    const walletServer = new WalletServer(context);

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

    /* Initialize Network (Chain) Providers */
    const localNodeNetworkProvider = new LocalNodeNetworkProvider();

    // initialize sake provider
    const sake = new SakeProviderManager(
        context,
        new LocalNodeSakeProvider(
            'local-chain-1',
            'Local Chain 1',
            localNodeNetworkProvider,
            sidebarSakeProvider
        )
    );

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
        vscode.commands.registerCommand(
            'Tools-for-Solidity.sake.call',
            (params: WakeCallRequestParams) => call(params, client, outputViewManager)
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
            'Tools-for-Solidity.sake.getBytecode',
            (params: WakeGetBytecodeRequestParams) => getBytecode(params, client)
        )
    );

    context.subscriptions.push(
        vscode.commands.registerCommand(
            'Tools-for-Solidity.sake.copyFromResults',
            (context: SakeOutputItem) => copyToClipboard(context.value)
        )
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('Tools-for-Solidity.sake.serve', async () => {
            console.log(`start serve`);
            walletServer
                .start()
                .then((port) => {
                    console.log(`Wallet Server running on http://localhost:${port}`);
                })
                .then(() => {
                    walletServer.openInBrowser();
                })
                .catch((err) => {
                    console.error(err);
                });
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand(
            'Tools-for-Solidity.sake.openDeploymentInBrowser',
            async (deploymentData: WalletDeploymentData) => {
                console.log(`start serve`);
                walletServer
                    .start()
                    .then((port) => {
                        console.log(`Wallet Server running on http://localhost:${port}`);
                    })
                    .then(() => {
                        walletServer.setDeploymentData(deploymentData);
                    })
                    .then(() => {
                        walletServer.openInBrowser();
                    })
                    .catch((err) => {
                        console.error(err);
                    });
            }
        )
    );

    vscode.workspace.onDidChangeTextDocument((e) => {
        if (e.document.languageId == 'solidity' && !e.document.isDirty) {
            sake.state.compiledContracts.makeDirty();
        }
        // TODO might need to rework using vscode.workspace.createFileSystemWatcher
    });
}

export function deactivateSake() {}
