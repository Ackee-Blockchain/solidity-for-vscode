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
import { SakeOutputItem } from './providers/OutputTreeProvider';
import { copyToClipboardHandler } from '../commands';
import { SakeProviderManager } from './sake_providers/SakeProviderManager';
import { SharedChainStateProvider } from './state/SharedChainStateProvider';
import { SakeContext } from './context';
import { SakeProviderFactory } from './sake_providers/SakeProviderFactory';

export async function activateSake(context: vscode.ExtensionContext, client: LanguageClient) {
    /* Register Context */
    const sakeContext = SakeContext.getInstance();
    sakeContext.context = context;
    sakeContext.client = client;

    /* Register Webview */
    const sidebarSakeProvider = new SakeWebviewProvider(context.extensionUri);
    context.subscriptions.push(
        vscode.window.registerWebviewViewProvider('sake', sidebarSakeProvider)
    );

    /* Register Webview Provider for Context */
    sakeContext.webviewProvider = sidebarSakeProvider;

    /* Initialize Chain State */
    const chainsState = SharedChainStateProvider.getInstance();

    /* Initialize Sake Provider */
    const sake = SakeProviderManager.getInstance();

    // Start with a default local chain
    const localProvider = await SakeProviderFactory.createNewLocalProvider('Local Chain');

    if (localProvider) {
        sake.addProvider(localProvider, false);
        sake.setProvider(localProvider.id);
    }

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
