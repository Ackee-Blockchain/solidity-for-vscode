import { SakeContext } from '../context';
import { SakeProviderManager } from '../sake_providers/SakeProviderManager';
import * as vscode from 'vscode';

export class StorageHandler {
    // USE EITHER CONTEXT.workspaceState OR CONTEXT.storageUri
    static readonly storageFolder = ['.wake', 'extension'];

    static async hasAnySavedState() {
        const state = await this.loadFromWorkspaceFolder('state.json');
        return state != undefined;
    }

    static async loadExtensionState() {
        const state = await this.loadFromWorkspaceFolder('state.json')
            .then((state) => {
                if (state == undefined) {
                    throw new Error('State file not found');
                }
                return JSON.parse(state);
            })
            .catch((e) => {
                vscode.window.showErrorMessage(
                    `Failed to load state: ${e instanceof Error ? e.message : String(e)}`
                );
                return undefined;
            });

        if (state == undefined) {
            return;
        }

        await SakeProviderManager.getInstance().loadState(state);
    }

    static async saveExtensionState() {
        const state = await SakeProviderManager.getInstance()
            .dumpState()
            .catch((e) => {
                vscode.window.showErrorMessage(
                    `Failed to dump state: ${e instanceof Error ? e.message : String(e)}`
                );
                return undefined;
            });

        if (state == undefined) {
            return;
        }

        // @dev BigInt fails to be serialized by JSON.stringify
        // see https://github.com/GoogleChromeLabs/jsbi/issues/30
        const encodedState = JSON.stringify(state, (key, value) =>
            typeof value === 'bigint' ? value.toString() : value
        );

        // also save to storageUri
        try {
            await this.saveToWorkspaceFolder('state.json', encodedState);
        } catch (e) {
            vscode.window.showErrorMessage(
                `Failed to save state: ${e instanceof Error ? e.message : String(e)}`
            );
        }
    }

    private static async saveToStorageUri(json: string) {
        // files will be save to .solidity folder

        if (this.context.storageUri == undefined) {
            throw new Error('Storage URI is undefined');
        }

        // create .solidity folder if it doesn't exist
        const solidityFolder = vscode.Uri.joinPath(this.context.storageUri, '.solidity');
        await vscode.workspace.fs.createDirectory(solidityFolder);

        // save to vscode storage
        const file = vscode.Uri.joinPath(solidityFolder, 'chains.json');
        await vscode.workspace.fs.writeFile(file, new TextEncoder().encode(json));

        // print where
        console.log(`Saved state to ${file.path}`);
    }

    private static async saveToWorkspaceFolder(filename: string, json: string) {
        // save to workspace folder
        // create workspace folder if it doesn't exist
        const workspaceFolder = vscode.workspace.workspaceFolders?.[0].uri;
        if (workspaceFolder == undefined) {
            throw new Error('Workspace folder is undefined');
        }

        const solidityFolder = vscode.Uri.joinPath(workspaceFolder, ...this.storageFolder);

        // check if .solidity folder exists
        await vscode.workspace.fs.createDirectory(solidityFolder);

        const file = vscode.Uri.joinPath(solidityFolder, filename);
        await vscode.workspace.fs.writeFile(file, new TextEncoder().encode(json));
    }

    private static async loadFromWorkspaceFolder(filename: string): Promise<string | undefined> {
        const workspaceFolder = vscode.workspace.workspaceFolders?.[0].uri;
        if (workspaceFolder == undefined) {
            throw new Error('Workspace folder is undefined');
        }

        const solidityFolder = vscode.Uri.joinPath(workspaceFolder, ...this.storageFolder);
        const file = vscode.Uri.joinPath(solidityFolder, filename);
        const content = await vscode.workspace.fs.readFile(file);
        return new TextDecoder().decode(content);
    }

    private static get context() {
        return SakeContext.getInstance().context;
    }
}
