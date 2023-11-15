import * as vscode from 'vscode';
import { WakeDetection } from './WakeDetection';
import { BaseItem } from './BaseItem';
import { PathItem } from './PathItem';
import { FileItem } from './FileItem';
import { DetectionItem } from './DetectionItem';

export class SeverityItem extends BaseItem<any> {

    constructor(severity: string, context: vscode.ExtensionContext) {
        let label: string;
        let icon: vscode.ThemeIcon;
        switch (severity) {
            case "error":
                label = "Error";
                icon = new vscode.ThemeIcon('error', new vscode.ThemeColor("notificationsErrorIcon.foreground"));
                break;
            case "warning":
                label = "Warning";
                icon = new vscode.ThemeIcon('warning', new vscode.ThemeColor("notificationsWarningIcon.foreground"));
                break;
            default:
                label = "Info";
                icon = new vscode.ThemeIcon('info', new vscode.ThemeColor("notificationsInfoIcon.foreground"));
                break;
        }
        super(severity, label, vscode.TreeItemCollapsibleState.Expanded, context);
        this.iconPath = icon;
    }

    addLeaf(leaf: WakeDetection) {
        let segments = leaf.diagnostic.data.sourceUnitName.split("/");
        let childNode = this.childsMap.get(segments[0]);

        if (segments.length > 1) {
            if (childNode == undefined) {
                childNode = new PathItem(segments[0], segments[0], this.context);
                this.addChild(childNode);
            }
            childNode.addLeaf(leaf, 1)
        } else {
            if (childNode == undefined) {
                childNode = new FileItem(leaf.uri, leaf.diagnostic.data.sourceUnitName, this.context);
                this.addChild(childNode);
            }
            childNode.addChild(new DetectionItem(leaf, this.context));
        }
        super.addLeaf(leaf)
    }
}
