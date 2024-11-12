import * as vscode from 'vscode';
import { SakeWebviewProvider } from './providers/WebviewProviders';
import { copyToClipboard, getTextFromInputBox, showErrorMessage } from './commands';
import {
    CallRequest,
    DeploymentRequest,
    SetAccountBalanceRequest,
    SetAccountLabelRequest,
    GetBytecodeRequest
} from './webview/shared/types';
import { LanguageClient, State } from 'vscode-languageclient/node';
import { SakeOutputItem } from './providers/OutputTreeProvider';
import { copyToClipboardHandler } from '../commands';
import SakeProviderManager from './sake_providers/SakeProviderManager';
import AppStateProvider from './state/AppStateProvider';
import { SakeContext } from './context';
import { SakeProviderFactory } from './sake_providers/SakeProviderFactory';
import { StorageHandler } from './storage/StorageHandler';
import { WakeChainDump } from './webview/shared/storage_types';
export async function activateSake(context: vscode.ExtensionContext, client: LanguageClient) {
    /* Register Context */
    const sakeContext = SakeContext.getInstance();
    sakeContext.context = context;
    sakeContext.client = client;

    /* Initialize Chain State */
    const appState = AppStateProvider.getInstance();
    appState.setInitializationState('initializing');

    /* Initialize Sake Provider */
    const sake = SakeProviderManager.getInstance();

    /* Register Webview */
    const sidebarSakeProvider = new SakeWebviewProvider(context.extensionUri);
    context.subscriptions.push(
        vscode.window.registerWebviewViewProvider('sake', sidebarSakeProvider)
    );

    /* Register Webview Provider for Context */
    sakeContext.webviewProvider = sidebarSakeProvider;

    /* Workspace watcher */

    const workspaceWatcher = () => {
        const workspaces = vscode.workspace.workspaceFolders;
        if (workspaces === undefined || workspaces.length === 0) {
            appState.setIsOpenWorkspace('closed');
            return;
        } else if (workspaces.length > 1) {
            appState.setIsOpenWorkspace('tooManyWorkspaces');
            return;
        }

        appState.setIsOpenWorkspace('open');
    };

    // check if workspace is open
    vscode.workspace.onDidChangeWorkspaceFolders(() => {
        workspaceWatcher();
    });

    workspaceWatcher();

    /* Wake Crash Dump */

    // client.onNotification('wake/sake/dumpState', (dump: any) => {
    //     console.log('Wake Crash Dump', dump);
    // });

    /* Register Commands */

    registerCommands(context, sake);

    /* Load Chains */

    appState.setInitializationState('loadingChains');

    await loadChains(sake);

    appState.setInitializationState('ready');
}

export function deactivateSake() {
    StorageHandler.saveExtensionState(false);
    // TODO save state
}

async function loadChains(sake: SakeProviderManager) {
    // Check if there is was any state saved
    if (await StorageHandler.hasAnySavedState()) {
        await StorageHandler.loadExtensionState(false).catch((e) => {
            showErrorMessage(
                'Saved extension state could not be loaded. Chain state save file was found but seems to be corrupted and could not be loaded.'
            );
            console.error('Failed to load saved state', e);
        });
    } else {
        // Start with a default local chain
        const localProvider = await SakeProviderFactory.createNewLocalProvider('Local Chain');

        if (localProvider) {
            sake.addProvider(localProvider, false);
            sake.setProvider(localProvider.id);
        }
    }
}

function registerCommands(context: vscode.ExtensionContext, sake: SakeProviderManager) {
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

    vscode.workspace.onDidChangeTextDocument((e) => {
        if (e.document.languageId == 'solidity' && !e.document.isDirty) {
            sake.state?.compilation.makeDirty();
        }
        // TODO might need to rework using vscode.workspace.createFileSystemWatcher
    });

    // TODO remove
    context.subscriptions.push(
        vscode.commands.registerCommand('Tools-for-Solidity.sake.save-state', () =>
            StorageHandler.saveExtensionState()
        )
    );
}
