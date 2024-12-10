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
import appState from '../state/AppStateProvider';
import * as vscode from 'vscode';
import { getTextFromInputBox, showErrorMessage } from '../commands';
import { BaseSakeProvider } from './SakeProvider';
import * as WakeApi from '../api/wake';
import { SakeProviderQuickPickItem } from '../webview/shared/helper_types';
import { SakeContext } from '../context';
import * as SakeProviderFactory from './SakeProviderFactory';
import { ProviderState, StoredSakeState } from '../webview/shared/storage_types';
import SakeState from './SakeState';
import { NetworkProvider } from '../network/NetworkProvider';
import { NetworkManager } from '../network/NetworkManager';
import { LocalNodeNetworkProvider } from '../network/LocalNodeNetworkProvider';
import { additionalSakeState, chainRegistry } from '../state/ChainRegistry';
import { providerRegistry } from './ProviderRegistry';

export const sakeProviderManager = {
    initialize() {
        this.pingWakeServer();

        providerRegistry.subscribeAdd((id) => {
            console.log('providerRegistry.subscribeAdd', id);
            if (this.currentChainId === undefined) {
                this.setProvider(id);
                vscode.window.showInformationMessage(
                    `New local chain '${this.provider!.displayName}' created.`
                );
                return;
            }
            vscode.window
                .showInformationMessage(
                    `New local chain '${chainRegistry.get(id)?.name}' created.`,
                    'Switch to chain'
                )
                .then((selected) => {
                    if (selected === 'Switch to chain') {
                        this.setProvider(id);
                    }
                });
        });
    },

    async pingWakeServer() {
        const isWakeServerRunning = await WakeApi.ping().catch((_) => {
            return false;
        });

        appState.setLazy({
            isWakeServerRunning: isWakeServerRunning
        });

        if (!isWakeServerRunning) {
            NetworkManager.getInstance().disconnectLocalProviders();
        }
    },

    async removeProvider(provider: BaseSakeProvider<NetworkProvider>) {
        if (!chainRegistry.contains(provider.id)) {
            throw new Error('Provider with id ' + provider.id + ' does not exist');
        }

        try {
            await provider.onDeleteProvider();
        } catch (e) {
            showErrorMessage(
                `Failed to delete chain: ${e instanceof Error ? e.message : String(e)}`
            );
        }

        if (provider.id === additionalSakeState.get().currentChainId) {
            additionalSakeState.setLazy({
                currentChainId: undefined
            });
        }
    },

    get currentChainId() {
        return additionalSakeState.get().currentChainId;
    },

    get provider() {
        if (!this.currentChainId) {
            return undefined;
        }

        return providerRegistry.get(this.currentChainId);
    },

    get providers() {
        return providerRegistry.getAll();
    },

    get state() {
        return this.provider?.states;
    },

    // get network() {
    //     return this.provider.network;
    // }

    setProvider(id: string) {
        if (!chainRegistry.contains(id)) {
            throw new Error('Provider with id ' + id + ' does not exist');
        }

        if (this.currentChainId === id) {
            return;
        }

        this.provider?.onDeactivateProvider();
        additionalSakeState.setLazy({
            currentChainId: id
        });
        this.provider?.onActivateProvider();
    },

    removeProxy(contractFqn: string, proxyAddress?: Address) {
        this.state?.deployment.removeProxy(contractFqn, proxyAddress);
    },

    showAddAbiQuickPick(contractFqn: string) {
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
    },

    showProviderSelectionQuickPick() {
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
            (item) => item.providerId === this.currentChainId
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
    },

    requestAddDeployedContract() {
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
    },

    async requestNewLocalProvider() {
        // get input from user
        const chainName = await getTextFromInputBox(
            'Select a name for the new chain',
            'Local Chain'
        );

        if (!chainName) {
            return;
        }

        await SakeProviderFactory.createNewLocalProvider(chainName);
    },

    async createNewLocalChain(
        displayName: string,
        networkCreationConfig?: NetworkCreationConfiguration
    ) {
        try {
            await SakeProviderFactory.createNewLocalProvider(displayName, networkCreationConfig);
        } catch (e) {
            return false;
        }
        return true; // always return true, so even unconnected chains can be added
    },

    async connectToLocalChain(displayName: string, uri: string) {
        try {
            const provider = await SakeProviderFactory.connectToLocalChain(displayName, uri);
        } catch (e) {
            return false;
        }
        return true;
    },

    async requestNewAdvancedLocalProvider() {
        this.sendSignalToWebview(SignalId.showAdvancedLocalChainSetup);
    },

    sendSignalToWebview(signal: SignalId, data?: any) {
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
    },

    reconnectChain(all: boolean = false) {
        if (all) {
            this.providers.forEach((provider) => {
                provider.connect();
            });
        } else {
            this.provider?.connect();
        }
    },

    /* State Handling */

    async dumpState(providerStates?: ProviderState[]) {
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
    },

    async loadState(state: StoredSakeState, silent: boolean = false) {
        SakeState.loadSharedState(state.sharedState);
        for (const providerState of state.providerStates) {
            try {
                await SakeProviderFactory.createFromState(providerState);
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
};

export default sakeProviderManager;
