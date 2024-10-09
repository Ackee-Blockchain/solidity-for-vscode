import { AbiFunctionFragment, Address, CallType } from '../webview/shared/types';
import { NetworkProvider } from '../network/networks';
import { BaseWebviewProvider } from './BaseWebviewProvider';
import * as vscode from 'vscode';
import { WakeApi } from '../api/wake';
import { SakeProvider } from './SakeProvider';

export class LocalNodeSakeProvider extends SakeProvider {
    private _wake: WakeApi;
    constructor(
        id: string,
        displayName: string,
        networkProvider: NetworkProvider,
        webviewProvider: BaseWebviewProvider
        // private wakeApi: WakeApi
    ) {
        super(id, displayName, networkProvider, webviewProvider);

        this._wake = WakeApi.getInstance();
    }

    async initialize(accounts: Address[]) {
        for (const account of accounts) {
            const accountDetails = await this.network.getAccountDetails(account);
            // console.log('account details', accountDetails);
            if (accountDetails) {
                this.state.accounts.add(accountDetails);
            }
        }
    }

    _getQuickPickItem(): vscode.QuickPickItem {
        return {
            label: this.displayName,
            detail: this.id,
            iconPath: this.chainState?.connected
                ? new vscode.ThemeIcon('vm-active')
                : new vscode.ThemeIcon('vm-outline')
        };
    }
}
