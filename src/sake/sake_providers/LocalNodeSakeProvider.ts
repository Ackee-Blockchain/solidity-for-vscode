import { AbiFunctionFragment, Address, CallType } from '../webview/shared/types';
import { NetworkProvider } from '../network/NetworkProvider';
import { BaseWebviewProvider } from '../providers/BaseWebviewProvider';
import * as vscode from 'vscode';
import { WakeApi } from '../api/wake';
import { SakeProvider } from './SakeProvider';
import { SakeProviderQuickPickItem } from '../webview/shared/helper_types';
import { SakeProviderManager } from './SakeProviderManager';
import { LocalNodeNetworkProvider } from '../network/LocalNodeNetworkProvider';

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

    async onDeleteProvider() {
        await this.network.deleteChain();
    }

    _getQuickPickItem(): SakeProviderQuickPickItem {
        console.log('getQuickPickItem', this.displayName);
        return {
            providerId: this.id,
            label: this.displayName,
            detail: this.id,
            iconPath: this.chainState?.connected
                ? new vscode.ThemeIcon('vm-active')
                : new vscode.ThemeIcon('vm-outline'),
            buttons: [
                {
                    iconPath: new vscode.ThemeIcon('refresh'),
                    tooltip: 'Reconnect'
                },
                {
                    iconPath: new vscode.ThemeIcon('trash'),
                    tooltip: 'Delete'
                }
            ],
            itemButtonClick: (
                button: vscode.QuickInputButton,
                quickPick: vscode.QuickPick<SakeProviderQuickPickItem>
            ) => {
                if (button.tooltip === 'Delete') {
                    WakeApi.disconnectChain({ sessionId: this.id });
                    SakeProviderManager.getInstance().removeProvider(this);
                    quickPick.hide();
                }
            }
        };
    }
}
