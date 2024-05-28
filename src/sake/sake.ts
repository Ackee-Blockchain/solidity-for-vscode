import * as vscode from 'vscode';
import { DeployWebviewProvider, CompilerWebviewProvider, RunWebviewProvider } from './providers/WebviewProviders';
import { StatusBarEnvironmentProvider } from './providers/StatusBarEnvironmentProvider';
import { copyToClipboardHandler, loadSampleAbi, getTextFromInputBox } from './commands';
import { DeployedContractsState } from './state/DeployedContractsState';
import { Contract } from './webview/shared/types';

export function activateSake(context: vscode.ExtensionContext) {
    const sidebarCompilerProvider = new CompilerWebviewProvider(context.extensionUri);

    context.subscriptions.push(
        vscode.window.registerWebviewViewProvider(
        "sake-compile",
        sidebarCompilerProvider
        )
    );

    const sidebarDeployProvider = new DeployWebviewProvider(context.extensionUri);
    context.subscriptions.push(
        vscode.window.registerWebviewViewProvider(
        "sake-deploy",
        sidebarDeployProvider
        )
    );

    const sidebarRunProvider = new RunWebviewProvider(context.extensionUri);
    context.subscriptions.push(
        vscode.window.registerWebviewViewProvider(
        "sake-run",
        sidebarRunProvider
        )
    );

    const deployedContractsState = DeployedContractsState.getInstance();
    deployedContractsState.subscribe(sidebarRunProvider);
    deployedContractsState.subscribe(sidebarDeployProvider);

    context.subscriptions.push(
        vscode.commands.registerCommand('sake.refresh', async () => {
            // TODO: change helloworld to sake
            // HelloWorldPanel.kill();
            // HelloWorldPanel.createOrShow(context.extensionUri);
        }
    ));

    context.subscriptions.push(
        vscode.commands.registerCommand('sake.sampleDeploy', async () => {
            const sampleContractAbi = await loadSampleAbi();
            const sampleContract: Contract = {
                name: "SampleContract",
                balance: 0, // had to add this
                address: "0x5B38Da6a701c568545dCfcB03FcB875f56beddC4",
                abi: sampleContractAbi
            };
            deployedContractsState.deploy(sampleContract);
        })
    );


    // register status bar
    const statusBarEnvironmentProvider = new StatusBarEnvironmentProvider();
    context.subscriptions.push(statusBarEnvironmentProvider.registerCommand());
    context.subscriptions.push(statusBarEnvironmentProvider.getStatusBarItem());

    // register commands
    context.subscriptions.push(vscode.commands.registerCommand('sake.copyToClipboard', async (text: string) => await copyToClipboardHandler(text)));
    context.subscriptions.push(vscode.commands.registerCommand('sake.getTextFromInputBox', async (initialValue: string) => await getTextFromInputBox(initialValue)));
    context.subscriptions.push(vscode.commands.registerCommand('sake.getCurrentFile', async () => {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            await vscode.window.showErrorMessage("No active editor found.");
            return;
        }
        const document = editor.document;
        const selection = editor.selection;
        const text = document.getText(selection);
        await vscode.window.showInformationMessage(text);
    }));
    context.subscriptions.push(vscode.commands.registerCommand('sake.getSampleContract', async () => {
        const sampleContractAbi = await loadSampleAbi();
        return sampleContractAbi;
    }
    ));

    // vscode.workspace.onDidChangeConfiguration((e) => {
    //     console.log("changed config", e);
    // });

    // vscode.workspace.onDidChangeTextDocument((e) => {
    //     console.log("changed text", e);
    // });

    // vscode.workspace.onDidOpenTextDocument((e) => {
    //     console.log("opened text", e);
    // });

    vscode.window.onDidChangeActiveTextEditor((e: vscode.TextEditor | undefined) => {
        sidebarCompilerProvider.postMessageToWebview({
            command: "onChangeActiveFile",
            payload: e
        });
    });


}

export function deactivateSake() {}
