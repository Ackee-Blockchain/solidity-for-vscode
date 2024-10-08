import { AbiFunctionFragment, CallType } from '../webview/shared/types';
import { LocalNodeNetworkProvider } from '../network/networks';
import { BaseWebviewProvider } from './BaseWebviewProvider';
import { SharedChainStateProvider } from '../state/SharedChainStateProvider';
import * as vscode from 'vscode';
import { v4 as uuidv4 } from 'uuid';
import { getTextFromInputBox } from '../commands';
import { LocalNodeSakeProvider, SakeProvider, SakeState } from './SakeProviders';

export class SakeProviderManager {
    private static _instance: SakeProviderManager;
    private static _context: vscode.ExtensionContext;
    private _selectedProviderId?: string;
    private _providers: Map<string, SakeProvider>;
    private _statusBarItem!: vscode.StatusBarItem;
    private _localNodeNetworkProvider: LocalNodeNetworkProvider;
    private _webviewProvider: BaseWebviewProvider | undefined;
    private _chainsState: SharedChainStateProvider;

    private constructor() {
        this._providers = new Map();
        this._localNodeNetworkProvider = new LocalNodeNetworkProvider();
        this._chainsState = SharedChainStateProvider.getInstance();
        this._initializeStatusBar();
        this._initializeChainsState();
    }

    private async _initializeChainsState() {
        // check if wake is running
        // TODO
        this.initializeWakeConnection();
    }

    public async initializeWakeConnection(): Promise<boolean> {
        // TODO
        this._chainsState.setIsWakeServerRunning(true);

        return true;
    }

    static initialize(context: vscode.ExtensionContext) {
        if (this._context) {
            throw new Error('SakeProviderManager already initialized');
        }

        this._context = context;
    }

    static getInstance(): SakeProviderManager {
        if (!this._context) {
            throw new Error('SakeProviderManager not initialized');
        }

        if (!this._instance) {
            this._instance = new SakeProviderManager();
        }

        return this._instance;
    }

    _setWebviewProvider(webviewProvider: BaseWebviewProvider) {
        if (this._webviewProvider) {
            throw new Error('Webview provider already set');
        }
        this._webviewProvider = webviewProvider;
    }

    addProvider(provider: SakeProvider) {
        if (this._providers.has(provider.id)) {
            throw new Error('Provider with id ' + provider.id + ' already exists');
        }

        this._providers.set(provider.id, provider);

        this._chainsState.addChain({
            chainId: provider.id,
            network: provider.network.id,
            connected: false
        });
    }

    removeProvider(id: string) {
        if (!this._providers.has(id)) {
            throw new Error('Provider with id ' + id + ' does not exist');
        }

        if (id === this._selectedProviderId) {
            throw new Error('Cannot remove the current provider');
        }

        this._providers.delete(id);

        this._chainsState.removeChain(id);
    }

    get provider(): SakeProvider | undefined {
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

        this._statusBarItem.text = `$(cloud) ${this.provider.displayName}`;
        this._statusBarItem.show();
    }

    public selectProvider() {
        const providerOptions = Array.from(this._providers.keys()).map((id) => ({ label: id }));
        providerOptions.unshift({ label: 'Request new chain' });
        vscode.window.showQuickPick(providerOptions).then((selected) => {
            if (selected) {
                if (selected.label === 'Request new chain') {
                    this.requestNewProvider();
                } else {
                    this.setProvider(selected.label);
                }
            }
        });
    }

    public async requestNewProvider() {
        if (!this._webviewProvider) {
            throw new Error('Webview provider not set');
        }

        // get input from user
        const chainName = await getTextFromInputBox(
            'Select a name for the new chain',
            'Local Chain'
        );

        if (!chainName) {
            return;
        }

        await this.createNewLocalChainProvider(chainName);
    }

    public async createNewLocalChainProvider(name: string, forceSetProvider: boolean = false) {
        if (!this._webviewProvider) {
            throw new Error('Webview provider not set');
        }

        const providerId = 'local-chain-' + uuidv4();

        const provider = new LocalNodeSakeProvider(
            providerId,
            name,
            this._localNodeNetworkProvider,
            this._webviewProvider
        );

        await provider.initialize();

        this.addProvider(provider);

        if (forceSetProvider) {
            this.setProvider(providerId);
            return;
        }

        vscode.window
            .showInformationMessage(`New local chain '${name}' created.`, 'Switch to chain')
            .then((selected) => {
                if (selected === 'Switch to chain') {
                    this.setProvider(providerId);
                }
            });
    }

    private _initializeStatusBar() {
        this._statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 1);
        SakeProviderManager._context.subscriptions.push(this._statusBarItem);
        SakeProviderManager._context.subscriptions.push(
            vscode.commands.registerCommand(
                'Tools-for-Solidity.sake.selectSakeProvider',
                this.selectProvider.bind(this)
            )
        );
        this._statusBarItem.command = 'Tools-for-Solidity.sake.selectSakeProvider';
        this._updateStatusBar();
    }
}
