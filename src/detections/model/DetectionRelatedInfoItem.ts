import * as vscode from 'vscode';
import { BaseItem } from './BaseItem';

export class DetectionRelatedInfoItem extends BaseItem<any> {

    relatedInfo: vscode.DiagnosticRelatedInformation;

    constructor(relatedInfo: vscode.DiagnosticRelatedInformation, context: vscode.ExtensionContext) {
        super(relatedInfo.message, relatedInfo.message, vscode.TreeItemCollapsibleState.None, context);
        this.relatedInfo = relatedInfo;
        this.command = {
            title: "Open",
            command: "Tools-for-Solidity.detections.open_file",
            arguments: [relatedInfo.location.uri, relatedInfo.location.range]
        };
        this.iconPath = new vscode.ThemeIcon('indent');
    }
}
