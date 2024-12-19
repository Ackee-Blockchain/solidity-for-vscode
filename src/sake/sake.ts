import * as vscode from 'vscode';
import { SakeWebviewProvider } from './providers/WebviewProviders';
import { copyToClipboard, getTextFromInputBox, showErrorMessage } from './commands';
import {
    CallRequest,
    DeploymentRequest,
    SetAccountBalanceRequest,
    SetAccountLabelRequest,
    GetBytecodeRequest,
    WakeCrashDumpStateResponse
} from './webview/shared/types';
import { LanguageClient, State } from 'vscode-languageclient/node';
import { SakeOutputItem } from './providers/OutputTreeProvider';
import { copyToClipboardHandler } from '../commands';
import SakeProviderManager, { sakeProviderManager } from './sake_providers/SakeProviderManager';
import AppStateProvider, { appState } from './state/AppStateProvider';
import { SakeContext } from './context';
import { StorageHandler } from './storage/StorageHandler';
import { WakeChainDump } from './webview/shared/storage_types';
export async function activateSake(context: vscode.ExtensionContext, client: LanguageClient) {
    /* Register Context */
    const sakeContext = SakeContext.getInstance();
    sakeContext.context = context;
    sakeContext.client = client;

    /* Initialize Chain and App State */
    appState.setLazy({
        initializationState: 'initializing'
    });

    appState.setLazy({ isWakeServerRunning: client.state === State.Running });
    client.onDidChangeState((state) => {
        appState.setLazy({ isWakeServerRunning: state.newState === State.Running });
    });

    /* Initialize Sake Provider */
    sakeProviderManager.initialize();

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
            appState.setLazy({
                isOpenWorkspace: 'closed'
            });
            return;
        } else if (workspaces.length > 1) {
            appState.setLazy({
                isOpenWorkspace: 'tooManyWorkspaces'
            });
            return;
        }

        appState.setLazy({
            isOpenWorkspace: 'open'
        });
    };

    // check if workspace is open
    vscode.workspace.onDidChangeWorkspaceFolders(() => {
        workspaceWatcher();
    });

    workspaceWatcher();

    /* Wake Crash Dump */

    client.onNotification('wake/sake/dumpState', (dump: WakeCrashDumpStateResponse) => {
        // StorageHandler.saveExtensionState(dump.chain_dump);
    });

    /* Register Commands */

    registerCommands(context);

    /* Load Chains */
    console.log('loading chains');
    appState.setLazy({
        initializationState: 'loadingChains'
    });

    await loadChains();

    console.log('setting ready');
    appState.setLazy({
        initializationState: 'ready'
    });
}

export function deactivateSake() {
    const sakeContext = SakeContext.getInstance();
    console.log('deactivating sake');
    sakeContext.context?.workspaceState.update('sake', 'deactivated');
    console.log(sakeContext.context?.workspaceState.get('sake'));
    StorageHandler.saveExtensionState(false);
    // TODO save state
}

async function loadChains() {
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
        await sakeProviderManager.createNewLocalChain('Local Chain 1');
    }
}

function registerCommands(context: vscode.ExtensionContext) {
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
            sakeProviderManager.provider?.compile()
        )
    );

    context.subscriptions.push(
        vscode.commands.registerCommand(
            'Tools-for-Solidity.sake.deploy',
            (request: DeploymentRequest) => sakeProviderManager.provider?.deployContract(request)
        )
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('Tools-for-Solidity.sake.getAccounts', () => {
            // TODO possibly remove
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('Tools-for-Solidity.sake.call', (request: CallRequest) =>
            sakeProviderManager.provider?.callContract(request)
        )
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('Tools-for-Solidity.sake.show_history', () =>
            sakeProviderManager.state?.history.show()
        )
    );

    context.subscriptions.push(
        vscode.commands.registerCommand(
            'Tools-for-Solidity.sake.setBalances',
            (request: SetAccountBalanceRequest) =>
                sakeProviderManager.provider?.setAccountBalance(request)
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
            (request: SetAccountLabelRequest) =>
                sakeProviderManager.provider?.setAccountLabel(request)
        )
    );

    context.subscriptions.push(
        vscode.commands.registerCommand(
            'Tools-for-Solidity.sake.getBytecode',
            (request: GetBytecodeRequest) => sakeProviderManager.provider?.getBytecode(request)
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
            sakeProviderManager.state?.compilation.makeDirty();
        }
        // TODO might need to rework using vscode.workspace.createFileSystemWatcher
    });

    // TODO remove
    context.subscriptions.push(
        vscode.commands.registerCommand('Tools-for-Solidity.sake.save-state', () =>
            StorageHandler.saveExtensionState()
        )
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('Tools-for-Solidity.sake.delete-state', () =>
            StorageHandler.deleteExtensionState()
        )
    );
}
