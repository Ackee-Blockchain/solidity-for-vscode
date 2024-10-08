import * as vscode from 'vscode';
import { SakeWebviewProvider } from './providers/WebviewProviders';
import { copyToClipboard, getTextFromInputBox } from './commands';
import {
    CallRequest,
    WalletDeploymentData,
    DeploymentRequest,
    SetAccountBalanceRequest,
    SetAccountLabelRequest,
    GetBytecodeRequest
} from './webview/shared/types';
import { LanguageClient } from 'vscode-languageclient/node';
import { WakeApi } from './api/wake';
import { OutputViewManager, SakeOutputItem } from './providers/OutputTreeProvider';
import { copyToClipboardHandler } from '../commands';
import { SakeProviderManager } from './providers/SakeProviderManager';

export function activateSake(context: vscode.ExtensionContext, client: LanguageClient) {
    /* Initializers */
    WakeApi.initialize(client);
    OutputViewManager.initialize(context);
    SakeProviderManager.initialize(context);

    /* Initialize Sake Provider */
    const sake = SakeProviderManager.getInstance();

    /* Register Webview */
    const sidebarSakeProvider = new SakeWebviewProvider(context.extensionUri);
    context.subscriptions.push(
        vscode.window.registerWebviewViewProvider('sake', sidebarSakeProvider)
    );

    /* Set Webview Provider */
    sake._setWebviewProvider(sidebarSakeProvider);

    // Start with a default local chain
    sake.createNewLocalChainProvider('Local Chain', true);

    /* Initialize Wallet Server */
    // const walletServer = new WalletServer(context);

    /* Initialize Network (Chain) Providers */

    // new LocalNodeSakeProvider(
    //     'local-chain-1',
    //     'Local Chain 1',
    //     localNodeNetworkProvider,
    //     sidebarSakeProvider
    // );

    // TODO remove unnecessary commands

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
        vscode.commands.registerCommand('Tools-for-Solidity.sake.compile', () =>
            sake.provider?.compile()
        )
    );

    context.subscriptions.push(
        vscode.commands.registerCommand(
            'Tools-for-Solidity.sake.deploy',
            (request: DeploymentRequest) => sake.provider?.deployContract(request)
        )
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('Tools-for-Solidity.sake.getAccounts', () => {
            // TODO possibly remove
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('Tools-for-Solidity.sake.call', (request: CallRequest) =>
            sake.provider?.callContract(request)
        )
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('Tools-for-Solidity.sake.show_history', () =>
            sake.state?.history.show()
        )
    );

    context.subscriptions.push(
        vscode.commands.registerCommand(
            'Tools-for-Solidity.sake.setBalances',
            (request: SetAccountBalanceRequest) => sake.provider?.setAccountBalance(request)
        )
    );

    context.subscriptions.push(
        vscode.commands.registerCommand(
            'Tools-for-Solidity.sake.getBalances',
            () => {}
            // TODO possibly remove
            // TODO add refresh account
        )
    );

    context.subscriptions.push(
        vscode.commands.registerCommand(
            'Tools-for-Solidity.sake.setLabel',
            (request: SetAccountLabelRequest) => sake.provider?.setAccountLabel(request)
        )
    );

    context.subscriptions.push(
        vscode.commands.registerCommand(
            'Tools-for-Solidity.sake.getBytecode',
            (request: GetBytecodeRequest) => sake.provider?.getBytecode(request)
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
            // console.log(`start serve`);
            // walletServer
            //     .start()
            //     .then((port) => {
            //         console.log(`Wallet Server running on http://localhost:${port}`);
            //     })
            //     .then(() => {
            //         walletServer.openInBrowser();
            //     })
            //     .catch((err) => {
            //         console.error(err);
            //     });
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand(
            'Tools-for-Solidity.sake.openDeploymentInBrowser',
            async (deploymentData: WalletDeploymentData) => {
                // console.log(`start serve`);
                // walletServer
                //     .start()
                //     .then((port) => {
                //         console.log(`Wallet Server running on http://localhost:${port}`);
                //     })
                //     .then(() => {
                //         walletServer.setDeploymentData(deploymentData);
                //     })
                //     .then(() => {
                //         walletServer.openInBrowser();
                //     })
                //     .catch((err) => {
                //         console.error(err);
                //     });
            }
        )
    );

    vscode.workspace.onDidChangeTextDocument((e) => {
        if (e.document.languageId == 'solidity' && !e.document.isDirty) {
            sake.state?.compilation.makeDirty();
        }
        // TODO might need to rework using vscode.workspace.createFileSystemWatcher
    });
}

export function deactivateSake() {}
