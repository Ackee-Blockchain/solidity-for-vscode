import {
    AccountState,
    DeploymentState,
    NetworkCreationConfiguration,
    SignalId,
    TransactionHistoryState,
    WebviewMessageId
} from '../webview/shared/types';
import AppStateProvider from '../state/AppStateProvider';
import * as vscode from 'vscode';
import { getTextFromInputBox, showErrorMessage } from '../commands';
import { BaseSakeProvider } from './SakeProvider';
import { WakeApi } from '../api/wake';
import { SakeProviderQuickPickItem } from '../webview/shared/helper_types';
import { SakeContext } from '../context';
import { LocalNodeSakeProvider } from './LocalNodeSakeProvider';
import { SakeProviderFactory } from './SakeProviderFactory';
import ChainStateProvider from '../state/ChainStateProvider';
import { StoredSakeState } from '../webview/shared/storage_types';
import SakeState from './SakeState';
import { NetworkProvider } from '../network/NetworkProvider';
import { NetworkManager } from '../network/NetworkManager';

export default class SakeProviderManager {
    private static _instance: SakeProviderManager;
    private _selectedProviderId?: string;
    private _providers: Map<string, BaseSakeProvider<NetworkProvider>>;
    private _statusBarItem!: vscode.StatusBarItem;
    private _chains: ChainStateProvider;
    private _app: AppStateProvider;

    private constructor() {
        this._providers = new Map();
        this._chains = ChainStateProvider.getInstance();
        this._app = AppStateProvider.getInstance();
        this._initializeState();
        this._initializeStatusBar();
    }

    private get _context(): vscode.ExtensionContext {
        const context = SakeContext.getInstance().context;
        if (!context) {
            throw new Error('Context not set');
        }
        return context;
    }

    private async _initializeState() {
        this.pingWakeServer();
    }

    public async pingWakeServer(): Promise<void> {
        const isWakeServerRunning = await WakeApi.ping().catch((e) => {
            // console.log('Failed to connect to wake server:', e);
            return false;
        });

        this._app.setIsWakeServerRunning(isWakeServerRunning);

        if (!isWakeServerRunning) {
            NetworkManager.getInstance().disconnectLocalProviders();
        }
    }

    static getInstance(): SakeProviderManager {
        if (!this._instance) {
            this._instance = new SakeProviderManager();
        }

        return this._instance;
    }

    addProvider(provider: BaseSakeProvider<NetworkProvider>, notifyUser: boolean = true) {
        if (this._providers.has(provider.id)) {
            throw new Error('Provider with id ' + provider.id + ' already exists');
        }

        this._providers.set(provider.id, provider);

        this._chains.addChain({
            chainId: provider.id,
            chainName: provider.displayName,
            network: provider.network.type,
            connected: provider.connected
        });

        if (this._selectedProviderId === undefined) {
            this.setProvider(provider.id);
            if (notifyUser) {
                vscode.window.showInformationMessage(
                    `New local chain '${provider.displayName}' created.`
                );
            }
            return;
        }

        if (notifyUser) {
            vscode.window
                .showInformationMessage(
                    `New local chain '${provider.displayName}' created.`,
                    'Switch to chain'
                )
                .then((selected) => {
                    if (selected === 'Switch to chain') {
                        this.setProvider(provider.id);
                    }
                });
        }
    }

    async removeProvider(provider: BaseSakeProvider<NetworkProvider>) {
        if (!this._providers.has(provider.id)) {
            throw new Error('Provider with id ' + provider.id + ' does not exist');
        }

        try {
            await provider.onDeleteProvider();
        } catch (e) {
            showErrorMessage(
                `Failed to delete chain: ${e instanceof Error ? e.message : String(e)}`
            );
        }

        if (provider.id === this._selectedProviderId) {
            this._selectedProviderId = undefined;
            this._chains.setCurrentChainId(undefined);
        }

        this._providers.delete(provider.id);
        this._chains.removeChain(provider.id);

        this._updateStatusBar();
    }

    get provider(): BaseSakeProvider<NetworkProvider> | undefined {
        if (!this._selectedProviderId) {
            return undefined;
        }

        return this._providers.get(this._selectedProviderId)!;
    }

    get state(): SakeState | undefined {
        return this.provider?.state;
    }

    // get network(): NetworkProvider {
    //     return this.provider.network;
    // }

    setProvider(id: string) {
        if (!this._providers.has(id)) {
            throw new Error('Provider with id ' + id + ' does not exist');
        }

        if (this._selectedProviderId === id) {
            return;
        }

        this.provider?.onDeactivateProvider();
        this._selectedProviderId = id;
        this.provider?.onActivateProvider();

        this._updateStatusBar();

        this._chains.setCurrentChainId(id);

        // force update provider
        this.state?.sendToWebview();

        // notify webviews of the switch
        // TODO
    }

    private _updateStatusBar() {
        // if (!this.provider) {
        //     this._statusBarItem.hide();
        //     return;
        // }
        if (!this.provider) {
            this._statusBarItem.text = '$(warning) No chain selected';
            this._statusBarItem.tooltip =
                'To use the Deploy & Intereact tab, please select a new chain or connect to an existing one.';
        } else {
            this._statusBarItem.text = this.provider._getStatusBarItemText();
            this._statusBarItem.tooltip = undefined;
        }

        this._statusBarItem.show();
    }

    public showProviderSelectionQuickPick() {
        const quickPickItems: vscode.QuickPickItem[] = [];

        const _providerItems = this.providers.map((provider: BaseSakeProvider<NetworkProvider>) =>
            provider._getQuickPickItem()
        );

        // extend with provider specific items
        quickPickItems.push(..._providerItems);

        // add separator
        quickPickItems.push({
            label: '',
            kind: vscode.QuickPickItemKind.Separator
        });

        // add option to request new chain
        quickPickItems.push({
            iconPath: new vscode.ThemeIcon('plus'),
            label: 'Create new local chain',
            kind: vscode.QuickPickItemKind.Default
        });

        // add option to connect setup advanced local node
        quickPickItems.push({
            iconPath: new vscode.ThemeIcon('plus'),
            label: 'Create new local chain (advanced)',
            kind: vscode.QuickPickItemKind.Default
        });

        // // add option to connect to remote node
        // quickPickItems.push({
        //     iconPath: new vscode.ThemeIcon('cloud'),
        //     label: 'Connect to remote node',
        //     kind: vscode.QuickPickItemKind.Default
        // });

        let selectedItem: SakeProviderQuickPickItem | undefined;

        // Create quick pick
        const providerSelector = vscode.window.createQuickPick<SakeProviderQuickPickItem>();
        providerSelector.items = quickPickItems;

        // Set active item
        const activeProviderItem = _providerItems.find(
            (item) => item.providerId === this._selectedProviderId
        );
        if (activeProviderItem) {
            providerSelector.activeItems = [activeProviderItem];
        }

        // Event handlers
        providerSelector.onDidChangeActive((selectedItems) => {
            selectedItem = selectedItems[0];
        });
        providerSelector.onDidTriggerItemButton((event) => {
            try {
                event.item.itemButtonClick?.(event.button);
            } catch (e) {
                showErrorMessage(`${e instanceof Error ? e.message : String(e)}`);
            } finally {
                providerSelector.dispose();
            }
        });
        providerSelector.onDidAccept(() => {
            try {
                if (!selectedItem) {
                    return;
                }
                if (selectedItem.label === 'Create new local chain') {
                    this.requestNewLocalProvider();
                } else if (selectedItem.label === 'Create new local chain (advanced)') {
                    this.requestNewAdvancedLocalProvider();
                } else if (selectedItem.label === 'Connect to remote node') {
                    // pass
                } else {
                    if (selectedItem.providerId) {
                        this.setProvider(selectedItem.providerId);
                    }
                }
            } catch (e) {
                showErrorMessage(`${e instanceof Error ? e.message : String(e)}`);
            } finally {
                providerSelector.dispose();
            }
        });
        providerSelector.onDidHide(() => {
            providerSelector.dispose();
        });
        providerSelector.show();

        // vscode.window.showQuickPick(quickPickItems).then((selected) => {
        //     if (selected) {
        //         if (selected.label === 'Create new local chain') {
        //             this.requestNewProvider();
        //         } else if (selected.label === 'Create new local chain (advanced)') {
        //             // pass
        //         } else if (selected.label === 'Connect to remote node') {
        //             // pass
        //         } else {
        //             this.setProvider(selected.label);
        //         }
        //     }
        // });
    }

    public async requestNewLocalProvider() {
        // get input from user
        const chainName = await getTextFromInputBox(
            'Select a name for the new chain',
            'Local Chain'
        );

        if (!chainName) {
            return;
        }

        const provider = await SakeProviderFactory.createNewLocalProvider(chainName);
        if (provider) {
            this.addProvider(provider);
        }
    }

    public async createNewLocalChain(
        displayName: string,
        networkCreationConfig?: NetworkCreationConfiguration
    ) {
        this.addProvider(
            await SakeProviderFactory.createNewLocalProvider(displayName, networkCreationConfig)
        );
    }

    public async requestNewAdvancedLocalProvider() {
        this.sendSignalToWebview(SignalId.showAdvancedLocalChainSetup);
    }

    private sendSignalToWebview(signal: SignalId, data?: any) {
        const webview = SakeContext.getInstance().webviewProvider;
        if (!webview) {
            console.error(`A signal (${signal}) was requested but no webview was found.`);
            return;
        }
        webview.postMessageToWebview({
            command: WebviewMessageId.onSignal,
            signalId: signal,
            payload: data
        });
    }

    private _initializeStatusBar() {
        this._statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 1);
        this._context.subscriptions.push(this._statusBarItem);
        this._context.subscriptions.push(
            vscode.commands.registerCommand(
                'Tools-for-Solidity.sake.selectSakeProvider',
                this.showProviderSelectionQuickPick.bind(this)
            )
        );
        this._statusBarItem.command = 'Tools-for-Solidity.sake.selectSakeProvider';
        this._updateStatusBar();
    }

    get providers() {
        return Array.from(this._providers.values());
    }

    reconnectChain(all: boolean = false) {
        if (all) {
            this.providers.forEach((provider) => {
                provider.connect();
            });
        } else {
            this.provider?.connect();
        }
    }

    /* State Handling */

    async dumpState(): Promise<StoredSakeState> {
        // Load all providers
        const providerStates = await Promise.all(
            this.providers.map((provider) => provider.dumpState())
        );

        // Load shared state
        const sharedState = SakeState.dumpSharedState();

        return {
            sharedState: sharedState,
            providerStates
        };
    }

    async loadState(state: StoredSakeState, silent: boolean = false) {
        SakeState.loadSharedState(state.sharedState);
        for (const providerState of state.providerStates) {
            try {
                const provider = await SakeProviderFactory.createFromState(providerState);
                if (provider) {
                    this.addProvider(provider, silent);
                }
            } catch (error) {
                console.error('Failed to create provider from state:', error);
                if (!silent) {
                    vscode.window.showErrorMessage(
                        `Failed to create provider from state: ${
                            error instanceof Error ? error.message : String(error)
                        }`
                    );
                }
            }
        }
    }
}
