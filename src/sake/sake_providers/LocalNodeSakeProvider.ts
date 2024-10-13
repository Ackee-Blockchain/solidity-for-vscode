import { AbiFunctionFragment, Address, CallType } from '../webview/shared/types';
import { NetworkProvider } from '../network/NetworkProvider';
import { BaseWebviewProvider } from '../providers/BaseWebviewProvider';
import * as vscode from 'vscode';
import { WakeApi } from '../api/wake';
import { SakeProvider } from './SakeProvider';
import { SakeProviderQuickPickItem } from '../webview/shared/helper_types';
import { SakeProviderManager } from './SakeProviderManager';
import { LocalNodeNetworkProvider } from '../network/LocalNodeNetworkProvider';
import { showErrorMessage } from '../commands';

export class LocalNodeSakeProvider extends SakeProvider<LocalNodeNetworkProvider> {
    constructor(id: string, displayName: string, network: LocalNodeNetworkProvider) {
        super(id, displayName, network);
    }

    async initialize() {
        const accounts = await this.network.getAccounts();
        for (const account of accounts) {
            const accountDetails = await this.network.getAccountDetails(account);
            if (accountDetails) {
                this.state.accounts.add(accountDetails);
            }
        }
    }

    async tryReconnect() {
        try {
            await this.network.initialize();
            await this.initialize();
        } catch (e) {
            showErrorMessage(`Failed to reconnect: ${e}`);
        }
    }

    async onDeleteProvider() {
        await this.network.deleteChain();
    }

    _getQuickPickItem(): SakeProviderQuickPickItem {
        const sake = SakeProviderManager.getInstance();
        const buttons = [
            {
                iconPath: new vscode.ThemeIcon('trash'),
                tooltip: 'Delete'
            }
        ];
        if (!this.network.connected) {
            buttons.push({
                iconPath: new vscode.ThemeIcon('refresh'),
                tooltip: 'Reconnect'
            });
        }
        return {
            providerId: this.id,
            label: this.displayName,
            detail: this.id,
            description: this.network.connected ? 'Connected' : 'Disconnected',
            iconPath: this.network.connected
                ? new vscode.ThemeIcon('vm-active')
                : new vscode.ThemeIcon('vm-outline'),
            buttons,
            itemButtonClick: (button: vscode.QuickInputButton) => {
                console.log('itemButtonClick', button);
                if (button.tooltip === 'Delete') {
                    WakeApi.disconnectChain({ sessionId: this.id });
                    sake.removeProvider(this);
                } else if (button.tooltip === 'Reconnect') {
                    this.tryReconnect();
                }
            }
        };
    }
}
