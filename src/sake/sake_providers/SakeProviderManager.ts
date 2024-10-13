import { NetworkCreationConfiguration } from '../webview/shared/types';
import { SharedChainStateProvider } from '../state/SharedChainStateProvider';
import * as vscode from 'vscode';
import { getTextFromInputBox, showErrorMessage } from '../commands';
import { SakeProvider, SakeState } from './SakeProvider';
import { WakeApi } from '../api/wake';
import { SakeProviderQuickPickItem } from '../webview/shared/helper_types';
import { SakeContext } from '../context';
import { LocalNodeSakeProvider } from './LocalNodeSakeProvider';
import { NetworkProvider } from '../network/NetworkProvider';
import { SakeProviderFactory } from './SakeProviderFactory';

export class SakeProviderManager {
    private static _instance: SakeProviderManager;
    private _selectedProviderId?: string;
    private _providers: Map<string, SakeProvider<NetworkProvider>>;
    private _statusBarItem!: vscode.StatusBarItem;
    private _chainsState: SharedChainStateProvider;

    private constructor() {
        this._providers = new Map();
        this._chainsState = SharedChainStateProvider.getInstance();
        this._initializeStatusBar();
        this._initializeChainsState();
    }

    private get _context(): vscode.ExtensionContext {
        return SakeContext.getInstance().context;
    }

    private async _initializeChainsState() {
        // check if wake is running
        // TODO
        this.initializeWakeConnection();
    }

    public async initializeWakeConnection(): Promise<boolean> {
        const isWakeServerRunning = await WakeApi.ping();
        this._chainsState.setIsWakeServerRunning(isWakeServerRunning);

        return true;
    }

    static getInstance(): SakeProviderManager {
        if (!this._instance) {
            this._instance = new SakeProviderManager();
        }

        return this._instance;
    }

    addProvider(provider: SakeProvider<NetworkProvider>, notifyUser: boolean = true) {
        if (this._providers.has(provider.id)) {
            throw new Error('Provider with id ' + provider.id + ' already exists');
        }

        this._providers.set(provider.id, provider);

        this._chainsState.addChain({
            chainId: provider.id,
            network: provider.network.id,
            connected: false
        });

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

    async removeProvider(provider: SakeProvider<NetworkProvider>) {
        if (!this._providers.has(provider.id)) {
            throw new Error('Provider with id ' + provider.id + ' does not exist');
        }

        if (provider.id === this._selectedProviderId) {
            this._selectedProviderId = undefined;
        }

        provider.onDeleteProvider();

        this._providers.delete(provider.id);
        this._chainsState.removeChain(provider.id);

        this._updateStatusBar();
    }

    get provider(): SakeProvider<NetworkProvider> | undefined {
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

        // force update provider
        this.state?.sendToWebview();

        // notify webviews of the switch
        // TODO
    }

    private _updateStatusBar() {
        if (!this.provider) {
            this._statusBarItem.hide();
            return;
        }

        // TODO icon
        // TODO add screen describing that no chain i selected to sake
        // const icon = this.provider.network.connected
        //     ? new vscode.ThemeIcon('vm-active')
        //     : new vscode.ThemeIcon('vm-outline');

        this._statusBarItem.text = `$(cloud) ${this.provider?.displayName}`;
        this._statusBarItem.show();
    }

    public showProviderSelectionQuickPick() {
        const quickPickItems: vscode.QuickPickItem[] = [];

        const _providerItems = this.providers.map((provider: SakeProvider<NetworkProvider>) =>
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

        // // add option to connect setup advanced local node
        // quickPickItems.push({
        //     iconPath: new vscode.ThemeIcon('plus'),
        //     label: 'Create new local chain (advanced)',
        //     kind: vscode.QuickPickItemKind.Default
        // });

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
                    this.requestNewProvider();
                } else if (selectedItem.label === 'Create new local chain (advanced)') {
                    // pass
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

    public async requestNewProvider() {
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
}
