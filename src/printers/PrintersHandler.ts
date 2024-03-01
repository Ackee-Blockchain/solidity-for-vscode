import * as vscode from 'vscode';
import { LanguageClient } from 'vscode-languageclient/node';
import { PrinterNotification } from './PrinterNotification';

export class PrintersHandler{

    context: vscode.ExtensionContext
    outputChannel: vscode.OutputChannel

    constructor(client: LanguageClient, context: vscode.ExtensionContext, outputChannel : vscode.OutputChannel) {
        this.context = context;
        this.outputChannel = outputChannel;
        
        client.onNotification("wake/executeCommands", (params) => {
            outputChannel.appendLine(JSON.stringify(params));
            this.onNotification(params as PrinterNotification);
        });
    }

    onNotification(params : PrinterNotification){

    }
}