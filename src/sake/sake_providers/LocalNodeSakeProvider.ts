import {
    AbiFunctionFragment,
    Address,
    CallType,
    SetAccountLabelRequest
} from '../webview/shared/types';
import { BaseWebviewProvider } from '../providers/BaseWebviewProvider';
import * as vscode from 'vscode';
import { WakeApi } from '../api/wake';
import { BaseSakeProvider } from './SakeProvider';
import { SakeProviderQuickPickItem } from '../webview/shared/helper_types';
import { SakeProviderManager } from './SakeProviderManager';
import { LocalNodeNetworkProvider } from '../network/LocalNodeNetworkProvider';
import { showErrorMessage } from '../commands';

export class LocalNodeSakeProvider extends BaseSakeProvider<LocalNodeNetworkProvider> {
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

    async onDeleteProvider(): Promise<void> {
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
        // if (!this.network.connected) {
        //     buttons.push({
        //         iconPath: new vscode.ThemeIcon('refresh'),
        //         tooltip: 'Reconnect'
        //     });
        // }
        return {
            providerId: this.id,
            label: this.displayName,
            detail: this.id,
            description: this.network.type,
            iconPath: this.state.app.state.isWakeServerRunning
                ? new vscode.ThemeIcon('vm-active')
                : new vscode.ThemeIcon('vm-outline'),
            buttons,
            itemButtonClick: (button: vscode.QuickInputButton) => {
                if (button.tooltip === 'Delete') {
                    sake.removeProvider(this);
                } else if (button.tooltip === 'Reconnect') {
                    this.tryReconnect();
                }
            }
        };
    }

    _getStatusBarItemText() {
        const icon = this.state.app.state.isWakeServerRunning ? '$(vm-active)' : '$(vm-outline)';
        return `${icon} ${this.displayName}`;
    }

    /* Overrides */

    async setAccountLabel(request: SetAccountLabelRequest) {
        super.setAccountLabel(request);
        try {
            await this.network.setAccountLabel(request);
        } catch (e) {
            console.log('Set account label error', e);
        }
    }
}
