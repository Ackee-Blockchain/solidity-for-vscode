import * as vscode from 'vscode';
import { LanguageClient, State } from 'vscode-languageclient/node';
import { copyToClipboard, showErrorMessage } from './commands';
import { SakeContext } from './context';
import { SakeOutputItem } from './providers/OutputTreeProvider';
import { SakeWebviewProvider } from './providers/WebviewProviders';
import { sakeProviderManager } from './sake_providers/SakeProviderManager';
import { pingWakeServer } from './utils/helpers';
import { NetworkType, WakeCrashDumpStateResponse } from './webview/shared/types';
import { chainRegistry } from './state/shared/ChainRegistry';
import * as SakeProviderFactory from './sake_providers/SakeProviderFactory';
import appState from './state/shared/AppState';
import { loadFullState, saveFullState } from './storage/stateHandler';
import { SakeProviderType } from './webview/shared/storage_types';

export async function activateSake(context: vscode.ExtensionContext, client: LanguageClient) {
    /* Register Context */
    const sakeContext = SakeContext.getInstance();
    sakeContext.context = context;
    sakeContext.client = client;

    /* Initialize Chain and App State */
    appState.setLazy({
        initializationState: 'initializing'
    });

    appState.setLazy({
        isWakeServerRunning: client.state === State.Running && (await pingWakeServer())
    });
    client.onDidChangeState((state) => {
        appState.setLazy({ isWakeServerRunning: state.newState === State.Running });
    });

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
    vscode.workspace.onDidChangeWorkspaceFolders(() => {
        workspaceWatcher();
    });
    workspaceWatcher();

    /*
     * Event listeners
     */

    // If Wake server is not running, disconnect all local node providers
    appState.subscribe((state) => {
        if (!state.isWakeServerRunning) {
            chainRegistry.getAll().forEach((provider) => {
                if (provider.type === SakeProviderType.LocalNode && provider.connected) {
                    provider.disconnect();
                }
            });
        }
    });

    // Set provider automatically when no provider is set
    chainRegistry.subscribeOnAdd((id) => {
        if (sakeProviderManager.currentChainId === undefined) {
            sakeProviderManager.setProvider(id);
        }
    });

    /* Wake Crash Dump */

    client.onNotification('wake/sake/dumpState', (dump: WakeCrashDumpStateResponse) => {
        // StorageHandler.saveExtensionState(dump.chain_dump);
    });

    /* Register Commands */

    registerCommands(context);

    /* Load Chains */
    appState.setLazy({
        initializationState: 'loadingChains'
    });
    await loadChains();
    appState.setLazy({
        initializationState: 'ready'
    });
}

export function deactivateSake() {}

async function loadChains() {
    await loadFullState();

    // Skip if any providers were loaded from state
    if (chainRegistry.getAll().length > 0) {
        return;
    }

    // Start with a default local chain
    await SakeProviderFactory.createNewLocalProvider('Local Chain 1', undefined, undefined, true);
}

function registerCommands(context: vscode.ExtensionContext) {
    context.subscriptions.push(
        vscode.commands.registerCommand('Tools-for-Solidity.sake.compile', () =>
            sakeProviderManager.provider?.compile()
        )
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('Tools-for-Solidity.sake.show_history', () =>
            sakeProviderManager.provider?.chainState.history.show()
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
            sakeProviderManager.provider?.chainState.compilation.makeDirty();
        }
        // @todo might need to rework using vscode.workspace.createFileSystemWatcher
    });

    context.subscriptions.push(
        vscode.commands.registerCommand('Tools-for-Solidity.sake.force-save-state', () =>
            saveFullState()
        )
    );
}
