import * as vscode from 'vscode';
import { ISakeProvider } from '../sake_providers/BaseSakeProvider';

class Autosaver {
    private delay: number;
    private timeouts: { [key: string]: NodeJS.Timeout | undefined } = {};

    constructor() {
        this.delay =
            vscode.workspace.getConfiguration('Tools-for-Solidity.sake').get('autosave.delay') ??
            30;
        if (this.delay == undefined) {
            console.warn('Autosave delay not set, using default of 30 seconds');
        }
    }

    onStateChange(provider: ISakeProvider) {
        if (this.timeouts[provider.id]) {
            clearTimeout(this.timeouts[provider.id]);
        }

        this.timeouts[provider.id] = setTimeout(() => {
            provider.saveState();
        }, this.delay * 1000);
    }

    removeTimeout(provider: ISakeProvider) {
        if (this.timeouts[provider.id]) {
            clearTimeout(this.timeouts[provider.id]);
            delete this.timeouts[provider.id];
        }
    }
}

export const autosaver = new Autosaver();

export const autosaveDefault: boolean =
    vscode.workspace.getConfiguration('Tools-for-Solidity.sake').get('autosave.enabled') ?? true;
