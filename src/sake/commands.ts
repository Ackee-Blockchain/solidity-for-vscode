import * as vscode from 'vscode';
import { LocalNodeNetworkProvider } from './network/LocalNodeNetworkProvider';
import { ISakeProvider } from './sake_providers/BaseSakeProvider';
import { sakeProviderManager } from './sake_providers/SakeProviderManager';
import { chainRegistry } from './state/shared/ChainRegistry';
import { SakeProviderQuickPickItem } from './webview/shared/helper_types';
import { Address, NetworkType } from './webview/shared/types';

export async function copyToClipboard(text: string | undefined) {
    if (!text) {
        vscode.window.showErrorMessage('Could not copy to clipboard.');
        return;
    }
    await vscode.env.clipboard.writeText(text);
    await vscode.window.showInformationMessage('Copied to clipboard.');
}

export async function getTextFromInputBox(title?: string, value?: string) {
    const result = await vscode.window.showInputBox({
        title,
        value
    });
    return result;
}

export async function navigateTo(path: string, startOffset?: number, endOffset?: number) {
    const uri = vscode.Uri.parse(path);

    const doc = await vscode.workspace.openTextDocument(uri);
    if (!doc) {
        return;
    }

    const editor = vscode.window.showTextDocument(doc);
    if (!editor) {
        return;
    }

    if (!startOffset || !endOffset) {
        return;
    }

    const startPosition = doc.positionAt(startOffset);
    const endPosition = doc.positionAt(endOffset);

    const range = new vscode.Range(startPosition, endPosition);

    if (vscode.window.activeTextEditor) {
        const target = new vscode.Selection(
            range.start.line,
            range.start.character,
            range.end.line,
            range.end.character
        );
        vscode.window.activeTextEditor.selection = target;
        vscode.window.activeTextEditor.revealRange(target, vscode.TextEditorRevealType.InCenter);
    }
}

export async function openExternal(path: string) {
    vscode.env.openExternal(vscode.Uri.parse(path));
}

export function showErrorMessage(message: string) {
    vscode.window.showErrorMessage(message);
}

export function showTimedInfoMessage(message: string, milliseconds: number = 5000) {
    vscode.window.withProgress(
        {
            location: vscode.ProgressLocation.Notification,
            title: message,
            cancellable: false
        },
        async (progress) => {
            // Set progress to 100% immediately
            progress.report({ increment: 100 });

            // Wait for 3 seconds (or the specified milliseconds)
            await new Promise((resolve) => setTimeout(resolve, milliseconds));
        }
    );
}

export function showInfoMessage(message: string) {
    vscode.window.showInformationMessage(message);
}

export function openSettings(settingsUrl: string) {
    vscode.commands.executeCommand('workbench.action.openSettings', settingsUrl);
}

export function showProviderSelectionQuickPick() {
    const quickPickItems: vscode.QuickPickItem[] = [];

    const providerItems = chainRegistry
        .getAll()
        .map((provider: ISakeProvider) => provider.getQuickPickItem());

    // extend with provider specific items
    quickPickItems.push(...providerItems);

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
    const activeProviderItem = providerItems.find(
        (item) => item.providerId === sakeProviderManager.currentChainId
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
                sakeProviderManager.requestNewLocalProvider();
            } else if (selectedItem.label === 'Create new local chain (advanced)') {
                sakeProviderManager.requestNewAdvancedLocalProvider();
            } else if (selectedItem.label === 'Connect to remote node') {
                // pass
            } else {
                if (selectedItem.providerId) {
                    sakeProviderManager.setProvider(selectedItem.providerId);
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
}

export function requestAddDeployedContract() {
    const provider = sakeProviderManager.provider;

    if (!provider) {
        return;
    }

    vscode.window
        .showInputBox({
            title: 'Input the contract address to retrieve from on-chain',
            value: ''
        })
        .then((address) => {
            if (!address) {
                return;
            }

            // check if the addess is not already in the deployment state
            if (provider.chainState.deployment.get().find((c) => c.address === address)) {
                // @todo show info notification when native notifications are implemented
                return;
            }

            provider.fetchContract(address);
        });
}

export function showAddAbiQuickPick(contractAddress: Address) {
    const provider = sakeProviderManager.provider;

    if (provider === undefined) {
        showErrorMessage('No chain selected');
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
                    label: 'Fetch ABI for on-chain contract',
                    description:
                        provider.network.type === NetworkType.Local &&
                        (provider.network as LocalNodeNetworkProvider).config.fork !== undefined
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
                if (provider.chainState.compilation.get().contracts.length === 0) {
                    showErrorMessage(
                        'Cannot add ABI from compiled contract: No compiled contracts found'
                    );
                    return;
                }
                vscode.window
                    .showQuickPick(
                        provider.chainState.compilation
                            .get()
                            .contracts.map((contract) => contract.fqn),
                        {
                            title: 'Select the contract to add the ABI from'
                        }
                    )
                    .then((selected) => {
                        if (selected) {
                            const compiledContract =
                                provider.chainState.compilation.getContract(selected);
                            if (compiledContract) {
                                provider.extendProxySupport(contractAddress, {
                                    address: undefined,
                                    abi: compiledContract.abi,
                                    name: selected
                                });
                            }
                        }
                    });
            } else if (selected.label === 'Fetch ABI for on-chain contract') {
                vscode.window
                    .showInputBox({
                        prompt: 'Enter the address of the contract to fetch the ABI for',
                        value: ''
                    })
                    .then((implementationAddress) => {
                        if (!implementationAddress) {
                            return;
                        }

                        provider
                            .getAbi(implementationAddress)
                            .then((contract) => {
                                provider.extendProxySupport(contractAddress, {
                                    address: implementationAddress,
                                    abi: contract.abi,
                                    name: contract.name
                                });
                                vscode.window.showInformationMessage(
                                    `Successfully fetched ABI for ${contract.name} and added to ${contractAddress}`
                                );
                            })
                            .catch((e) => {
                                console.error(
                                    `Failed to fetch ABI for ${implementationAddress}: ${
                                        e instanceof Error ? e.message : String(e)
                                    }`
                                );
                                vscode.window.showErrorMessage(
                                    `Unable to fetch ABI for ${implementationAddress}`
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
                                provider.extendProxySupport(contractAddress, {
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
