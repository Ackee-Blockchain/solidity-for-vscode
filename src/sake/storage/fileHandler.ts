import * as vscode from 'vscode';

/** Storage folder path segments */
export const storageFolder = ['.wake', 'extension'];

/**
 * Checks if a file exists in the workspace state storage
 * @param filename - The name of the file to check
 * @returns Promise<boolean> - True if the file exists, false otherwise
 */
export async function existsInWorkspaceState(filename: string) {
    const state = await loadFromWorkspaceState(filename);
    return state != undefined;
}

/**
 * Saves JSON content to a file in the workspace state storage
 * @param filename - The name of the file to save to
 * @param json - The JSON string to save
 * @throws Error if workspace folder is undefined
 */
export async function saveToWorkspaceState(filename: string, json: string) {
    // save to workspace folder
    // create workspace folder if it doesn't exist
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0].uri;
    if (workspaceFolder == undefined) {
        throw new Error('Workspace folder is undefined');
    }

    const solidityFolder = vscode.Uri.joinPath(workspaceFolder, ...storageFolder);

    // check if extension folder exists
    await vscode.workspace.fs.createDirectory(solidityFolder);

    const file = vscode.Uri.joinPath(solidityFolder, filename);
    await vscode.workspace.fs.writeFile(file, new TextEncoder().encode(json));

    console.log('saved state to file', filename);
}

/**
 * Loads content from a file in the workspace state storage
 * @param filename - The name of the file to load from
 * @returns Promise<string | undefined> - The file content as string if exists, undefined otherwise
 * @throws Error if workspace folder is undefined
 */
export async function loadFromWorkspaceState(filename: string): Promise<string | undefined> {
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0].uri;
    if (workspaceFolder == undefined) {
        throw new Error('Workspace folder is undefined');
    }

    const solidityFolder = vscode.Uri.joinPath(workspaceFolder, ...storageFolder);
    const file = vscode.Uri.joinPath(solidityFolder, filename);

    try {
        const content = await vscode.workspace.fs.readFile(file);
        return new TextDecoder().decode(content);
    } catch (e) {
        return undefined;
    }
}

/**
 * Deletes a file from the workspace state storage
 * @param filename - The name of the file to delete
 * @throws Error if workspace folder is undefined
 */
export async function deleteFromWorkspaceState(filename: string) {
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0].uri;
    if (workspaceFolder == undefined) {
        throw new Error('Workspace folder is undefined');
    }

    const solidityFolder = vscode.Uri.joinPath(workspaceFolder, ...storageFolder);
    const file = vscode.Uri.joinPath(solidityFolder, filename);
    await vscode.workspace.fs.delete(file);
}

/**
 * Lists all files in the workspace state storage
 * @returns Promise<string[]> - An array of file names
 * @throws Error if workspace folder is undefined
 */
export async function listFilesInWorkspaceState() {
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0].uri;
    if (workspaceFolder == undefined) {
        throw new Error('Workspace folder is undefined');
    }

    const solidityFolder = vscode.Uri.joinPath(workspaceFolder, ...storageFolder);

    try {
        const files = Array.from(
            (await vscode.workspace.fs.readDirectory(solidityFolder)).map(([name, _]) => name)
        );
        return files;
    } catch (_) {
        return [];
    }
}
