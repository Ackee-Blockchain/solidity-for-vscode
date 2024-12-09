import {
    AccountState,
    Address,
    DeployedContractType,
    DeploymentState,
    NetworkCreationConfiguration,
    NetworkId,
    SignalId,
    TransactionHistoryState,
    WebviewMessageId
} from '../webview/shared/types';
import AppStateProvider from '../state/AppStateProvider';
import * as vscode from 'vscode';
import { getTextFromInputBox, showErrorMessage } from '../commands';
import { BaseSakeProvider } from './SakeProvider';
import * as WakeApi from '../api/wake';
import { SakeProviderQuickPickItem } from '../webview/shared/helper_types';
import { SakeContext } from '../context';
import { LocalNodeSakeProvider } from './LocalNodeSakeProvider';
import { SakeProviderFactory } from './SakeProviderFactory';
import ChainStateProvider from '../state/ChainStateProvider';
import { ProviderState, StoredSakeState } from '../webview/shared/storage_types';
import SakeState from './SakeState';
import { NetworkProvider } from '../network/NetworkProvider';
import { NetworkManager } from '../network/NetworkManager';
import { LocalNodeNetworkProvider } from '../network/LocalNodeNetworkProvider';
import { chainRegistry } from './ChainHook';

export default class SakeProviderManager {
    private static _instance: SakeProviderManager;
    // private _selectedProviderId?: string;
    // private _providers: Map<string, BaseSakeProvider<NetworkProvider>>;
    private _statusBarItem!: vscode.StatusBarItem;
    private _chains: ChainStateProvider;
    private _app: AppStateProvider;

    private constructor() {
        // this._providers = new Map();
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
        if (chainRegistry.contains(provider.id)) {
            throw new Error('Provider with id ' + provider.id + ' already exists');
        }

        if (this._providers.has(provider.id)) {
            throw new Error('Provider with id ' + provider.id + ' already exists');
        }

        this._providers.set(provider.id, provider);

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

        this._updateStatusBar();
    }

    get provider(): BaseSakeProvider<NetworkProvider> | undefined {
        if (!this._selectedProviderId) {
            return undefined;
        }

        return this._providers.get(this._selectedProviderId)!;
    }

    get state(): SakeState | undefined {
        return this.provider?.states;
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

    public removeProxy(contractFqn: string, proxyAddress?: Address) {
        this.state?.deployment.removeProxy(contractFqn, proxyAddress);
    }

    public showAddAbiQuickPick(contractFqn: string) {
        const _provider = this.provider;

        if (this.state === undefined || _provider === undefined) {
            return;
        }

        vscode.window
            .showQuickPick(
                [
                    {
                        label: 'Add from compiled contract',
                        description: 'Add an ABI from a compiled contract'
                    },
                    {
                        label: 'Fetch ABI from chain',
                        description:
                            _provider.network.type === NetworkId.LocalNode &&
                            (_provider.network as LocalNodeNetworkProvider).config.fork !==
                                undefined
                                ? 'Fetch the ABI of a contract from onchain using Etherscan or Sourcify'
                                : 'Fetch the ABI of a contract from the local chain'
                    },
                    {
                        label: 'Copy-paste ABI',
                        description: 'Add an existing ABI to the deployment'
                    }
                ],
                {
                    title: 'Select method to extend ABI'
                }
            )
            .then((selected) => {
                if (!selected) {
                    return;
                }

                if (selected.label === 'Add from compiled contract') {
                    if (this.state === undefined) {
                        showErrorMessage('No compilation state found');
                        return;
                    }
                    if (this.state?.compilation.state.contracts.length === 0) {
                        showErrorMessage(
                            'Cannot add ABI from compiled contract: No compiled contracts found'
                        );
                        return;
                    }
                    vscode.window
                        .showQuickPick(
                            this.state?.compilation.state.contracts.map((contract) => contract.fqn),
                            {
                                title: 'Select the contract to add the ABI from'
                            }
                        )
                        .then((selected) => {
                            if (selected) {
                                const abi = this.state?.compilation.get(selected)?.abi;
                                if (abi) {
                                    this.state?.deployment.extendProxySupport(contractFqn, {
                                        address: undefined,
                                        abi,
                                        name: selected
                                    });
                                }
                            }
                        });
                } else if (selected.label === 'Fetch ABI from chain') {
                    vscode.window
                        .showInputBox({
                            prompt: 'Enter the address of the contract to fetch the ABI from',
                            value: ''
                        })
                        .then((address) => {
                            if (!address) {
                                return;
                            }

                            this.provider
                                ?.getAbi(address)
                                .then((contract) => {
                                    this.state?.deployment.extendProxySupport(contractFqn, {
                                        address,
                                        abi: contract.abi,
                                        name: contract.name
                                    });
                                    vscode.window.showInformationMessage(
                                        `Successfully fetched ABI from ${contract.name} and added to ${contractFqn}`
                                    );
                                })
                                .catch((e) => {
                                    console.error(
                                        `Failed to fetch ABI from ${address}: ${
                                            e instanceof Error ? e.message : String(e)
                                        }`
                                    );
                                    vscode.window.showErrorMessage(
                                        `Unable to fetch ABI from ${address}`
                                    );
                                });
                        });
                } else if (selected.label === 'Copy-paste ABI') {
                    vscode.window
                        .showInputBox({
                            prompt: 'Enter the ABI to add',
                            value: ''
                        })
                        .then((abiString) => {
                            if (abiString) {
                                // try to parse the abi
                                try {
                                    const abi = JSON.parse(abiString);
                                    // @todo missing validation, add zod
                                    this.state?.deployment.extendProxySupport(contractFqn, {
                                        address: undefined,
                                        abi,
                                        name: undefined
                                    });
                                } catch (e) {
                                    showErrorMessage(
                                        `Failed to parse ABI: ${e instanceof Error ? e.message : String(e)}`
                                    );
                                }
                            }
                        });
                }
            });
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

    public requestAddDeployedContract() {
        if (!this.provider) {
            return;
        }

        vscode.window
            .showInputBox({
                title: 'Input the contract address to retrieve from onchain',
                value: ''
            })
            .then((address) => {
                if (!address) {
                    return;
                }
                // check if the addess is not already in the deployment state
                if (this.state?.deployment.state.find((c) => c.address === address)) {
                    // @todo show info message when native messaging is implemented
                    return;
                }
                this.provider
                    ?.getAbi(address)
                    .then((contract) => {
                        this.provider?.states?.deployment.add({
                            type: DeployedContractType.OnChain,
                            address: address,
                            abi: contract.abi,
                            name: contract.name,
                            balance: undefined
                        });
                        vscode.window.showInformationMessage(
                            `Successfully fetched ${contract.name} from ${address}`
                        );
                    })
                    .catch((e) => {
                        console.error(
                            `Failed to fetch ABI from ${address}: ${
                                e instanceof Error ? e.message : String(e)
                            }`
                        );
                        vscode.window.showErrorMessage(`Unable to fetch ABI from ${address}`);
                    });
            });
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
        const provider = await SakeProviderFactory.createNewLocalProvider(
            displayName,
            networkCreationConfig
        );
        this.addProvider(provider);
        return true; // always return true, so even unconnected chains can be added
    }

    public async connectToLocalChain(displayName: string, uri: string): Promise<boolean> {
        const provider = await SakeProviderFactory.connectToLocalChain(displayName, uri);
        if (provider.connected) {
            // only add the chain if connection was successful
            this.addProvider(provider);
        }
        return provider.connected;
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

    async dumpState(providerStates?: ProviderState[]): Promise<StoredSakeState> {
        // Load all providers
        if (providerStates === undefined) {
            providerStates = await Promise.all(
                this.providers.map((provider) => provider.dumpState())
            );
        }

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
