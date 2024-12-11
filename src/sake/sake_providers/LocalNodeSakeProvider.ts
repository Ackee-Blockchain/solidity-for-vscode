import { SetAccountLabelRequest } from '../webview/shared/types';
import * as vscode from 'vscode';
import { BaseSakeProvider } from './SakeProvider';
import { SakeProviderQuickPickItem } from '../webview/shared/helper_types';
import SakeProviderManager, { sakeProviderManager } from './SakeProviderManager';
import { LocalNodeNetworkProvider } from '../network/LocalNodeNetworkProvider';
import {
    SakeLocalNodeProviderInitializationRequest,
    SakeProviderInitializationRequestType
} from '../webview/shared/storage_types';
import { SakeError } from '../webview/shared/errors';

export class LocalNodeSakeProvider extends BaseSakeProvider<LocalNodeNetworkProvider> {
    constructor(
        id: string,
        displayName: string,
        network: LocalNodeNetworkProvider,
        initializationRequest: SakeLocalNodeProviderInitializationRequest
    ) {
        super(id, displayName, network, initializationRequest);
    }

    async connect(): Promise<void> {
        if (this.connected) {
            throw new SakeError('Cannot connect provider, already connected');
        }

        let accounts = [];
        switch (this.initializationRequest.type) {
            case SakeProviderInitializationRequestType.CreateNewChain:
                await this.network.createChain(this.initializationRequest.accounts);

                accounts = await this.network.getAccounts();
                for (const account of accounts) {
                    const accountDetails = await this.network.getAccountDetails(account);
                    if (accountDetails) {
                        this.states.accounts.add(accountDetails);
                    }
                }
                break;

            case SakeProviderInitializationRequestType.LoadFromState:
                await this.network.createChain();
                await this.network.loadState(this.initializationRequest.state.network.wakeDump);
                this.states.loadProviderState(this.initializationRequest.state.state);
                break;

            case SakeProviderInitializationRequestType.ConnectToChain:
                await this.network.connectChain();

                accounts = await this.network.getAccounts();
                for (const account of accounts) {
                    const accountDetails = await this.network.getAccountDetails(account);
                    if (accountDetails) {
                        this.states.accounts.add(accountDetails);
                    }
                }
                break;
        }

        this.connected = true;
    }

    async onDeleteProvider(): Promise<void> {
        await super.onDeleteProvider();
        if (this.connected) {
            await this.network.deleteChain();
        }
    }

    _getQuickPickItem(): SakeProviderQuickPickItem {
        const buttons = [
            {
                iconPath: new vscode.ThemeIcon('trash'),
                tooltip: 'Delete'
            }
        ];
        // if (!this.connected) {
        //     buttons.push({
        //         iconPath: new vscode.ThemeIcon('refresh'),
        //         tooltip: 'Reconnect'
        //     });
        // }
        return {
            providerId: this.id,
            label: this.displayName,
            detail: this.connected ? 'Connected' : 'Disconnected',
            description: this.network.type,
            iconPath: this.connected
                ? new vscode.ThemeIcon('vm-active')
                : new vscode.ThemeIcon('vm-outline'),
            buttons,
            itemButtonClick: (button: vscode.QuickInputButton) => {
                if (button.tooltip === 'Delete') {
                    sakeProviderManager.removeProvider(this);
                }
            }
        };
    }

    _getStatusBarItemText() {
        const icon = this.connected ? '$(vm-active)' : '$(vm-outline)';
        return `${icon} ${this.displayName}`;
    }

    /* Overrides */

    async setAccountLabel(request: SetAccountLabelRequest) {
        super.setAccountLabel(request);
        try {
            await this.network.setAccountLabel(request);
        } catch (e) {
            console.error('Set account label error', e);
        }
    }
}
