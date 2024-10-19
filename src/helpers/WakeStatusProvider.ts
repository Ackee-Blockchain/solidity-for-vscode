import * as vscode from 'vscode';
import { SakeContext } from '../sake/context';
import { LanguageClient, State } from 'vscode-languageclient/node';
import { restartWakeClient } from '../commands';
import { MarkdownString } from 'vscode';

export class WakeStatusBarProvider {
    // private static instance: WakeStatusBarProvider;
    private _statusBarItem!: vscode.StatusBarItem;

    constructor(private client: LanguageClient) {
        this._initializeStatusBar();
        this._initializeCommands();
        this.client.onDidChangeState((state) => {
            this._updateStatusBar();
        });
    }

    private _initializeCommands() {
        vscode.commands.registerCommand('Tools-for-Solidity.wake.restart_client', () => {
            restartWakeClient(this.client);
        });
    }

    private _initializeStatusBar() {
        this._statusBarItem = vscode.window.createStatusBarItem(
            vscode.StatusBarAlignment.Left,
            100
        );
        this._updateStatusBar();
    }

    private _updateStatusBar() {
        this._statusBarItem.backgroundColor = undefined;
        this._statusBarItem.command = undefined;
        this._statusBarItem.show();

        switch (this.client.state) {
            case State.Running:
                // this._statusBarItem.hide()
                this._statusBarItem.text = '$(check-all) Wake';
                this._statusBarItem.tooltip = 'Wake LSP is running';
                break;
            case State.Stopped:
                this._statusBarItem.text = '$(refresh) Wake';
                this._statusBarItem.tooltip =
                    'Cannot connect to Wake LSP required by Solidity (Wake).\nClick to restart client.';
                this._statusBarItem.backgroundColor = new vscode.ThemeColor(
                    'statusBarItem.errorBackground'
                );
                this._statusBarItem.command = 'Tools-for-Solidity.wake.restart_client';
                break;
            case State.Starting:
                this._statusBarItem.text = '$(sync~spin) Wake';
                this._statusBarItem.tooltip = 'Connecting to Wake LSP...';
                break;
            default:
                this._statusBarItem.hide();
                break;
        }
    }
}
