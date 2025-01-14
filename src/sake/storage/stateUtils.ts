import * as vscode from 'vscode';
import { ProviderState, SharedState, StoredSakeState } from '../webview/shared/storage_types';
import {
    deleteFromWorkspaceState,
    listFilesInWorkspaceState,
    loadFromWorkspaceState,
    saveToWorkspaceState,
    storageFolder
} from './fileHandler';
import { SakeContext } from '../context';

const providerStatePrefix = 'local';
const sharedStatePrefix = 'shared';

/**
 * Parses a string into a ProviderState object
 * @param state - The string to parse
 * @returns ProviderState - The parsed provider state
 * @throws Error if state is undefined
 */
export function parseProviderState(state: string | undefined): ProviderState {
    if (state == undefined) {
        throw new Error('State file not found');
    }
    // @todo add validation
    return JSON.parse(state);
}

/**
 * Serializes a ProviderState object into a string
 * @param state - The ProviderState to serialize
 * @returns string - The serialized state
 */
export function serializeProviderState(state: ProviderState): string {
    return JSON.stringify(state, (key, value) =>
        typeof value === 'bigint' ? value.toString() : value
    );
}

/**
 * Parses a string into a SharedState object
 * @param state - The string to parse
 * @returns SharedState - The parsed shared state
 * @throws Error if state is undefined
 */
export function parseSharedState(state: string | undefined): SharedState {
    if (state == undefined) {
        throw new Error('Shared state file not found');
    }
    return JSON.parse(state);
}

/**
 * Serializes a SharedState object into a string
 * @param state - The SharedState to serialize
 * @returns string - The serialized state
 */
export function serializeSharedState(state: SharedState): string {
    return JSON.stringify(state, (key, value) =>
        typeof value === 'bigint' ? value.toString() : value
    );
}

/**
 * Saves all provider states from a StoredSakeState
 * @param state - The StoredSakeState containing provider states to save
 * @param notifyUser - Whether to notify the user of the save (default: true)
 */
export async function saveFullState(state: StoredSakeState, notifyUser: boolean = true) {
    state.providerStates.forEach(async (providerState) => {
        await saveProviderState(providerState);
    });
}

/**
 * Saves a single provider state
 * @param state - The ProviderState to save
 */
export async function saveProviderState(state: ProviderState) {
    await saveToWorkspaceState(providerStateFilename(state), serializeProviderState(state));
}

/**
 * Deletes all files in the workspace state storage
 */
export async function deleteFullState() {
    const files = await listFilesInWorkspaceState();
    files.forEach(async (file) => {
        await deleteFromWorkspaceState(file);
    });
}

/**
 * Deletes a single provider state file
 * @param state - The ProviderState to delete
 */
export async function deleteProviderState(state: { id: string }) {
    await deleteFromWorkspaceState(providerStateFilename(state));
}

/**
 * Reads all provider states from workspace storage
 * @returns Promise<StoredSakeState> - Object containing all provider states
 */
export async function readFullState(): Promise<StoredSakeState> {
    const files = await listFilesInWorkspaceState();

    const providerStates = await Promise.all(
        files
            .filter((file) => file.startsWith(providerStatePrefix))
            .map(async (file) => {
                const state = await loadFromWorkspaceState(file);
                return parseProviderState(state);
            })
    );

    return {
        sharedState: {},
        providerStates
    };
}

/**
 * Reads a single provider state from storage
 * @param state - The ProviderState to read
 * @returns Promise<ProviderState> - The provider state read from storage
 */
export async function readProviderState(state: { id: string }) {
    return parseProviderState(await loadFromWorkspaceState(providerStateFilename(state)));
}

/**
 * Generates the filename for a provider state
 * @param state - The ProviderState to generate filename for
 * @returns string - The generated filename
 */
export function providerStateFilename(state: { id: string }) {
    return providerStatePrefix + '-' + state.id + '.json';
}

/**
 * Generates the filename for shared state
 * @returns string - The shared state filename
 */
export function sharedStateFilename() {
    return sharedStatePrefix + '.json';
}

export function createChainStateFileWatcher(state: { id: string }, callback: () => void) {
    const workspaces = vscode.workspace.workspaceFolders;
    if (workspaces === undefined || workspaces.length > 1) {
        return;
    }

    const workspace = workspaces[0];
    const fileWatcher = vscode.workspace.createFileSystemWatcher(
        new vscode.RelativePattern(
            workspace,
            storageFolder.join('/') + '/' + providerStateFilename(state)
        ),
        true,
        true
    );

    SakeContext.getInstance().context?.subscriptions.push(fileWatcher);

    fileWatcher.onDidDelete(() => {
        callback();
    });
}
