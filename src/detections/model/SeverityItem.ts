import * as vscode from 'vscode';
import { WakeDetection } from './WakeDetection';
import { BaseRootItem } from './BaseRootItem';
import { PathItem } from './PathItem';

export class SeverityItem extends BaseRootItem {

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
        super(severity, label, context);
        this.iconPath = icon;
    }

    addLeaf(leaf: WakeDetection) {
        let segments = leaf.diagnostic.data.sourceUnitName.split("/");
        if (segments.length > 1) {
            let childNode = this.childsMap.get(segments[0]);
            if (childNode == undefined) {
                childNode = new PathItem(segments[0], this.context);
                this.addChild(childNode);
            }
            childNode.addLeaf(leaf, 1)
        }
        super.addLeaf(leaf)
    }
}
