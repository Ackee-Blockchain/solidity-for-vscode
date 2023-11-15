import * as vscode from 'vscode';
import { BaseItem } from './BaseItem';
import { WakeDetection } from './WakeDetection';
import { PathItem } from './PathItem';
import { FileItem } from './FileItem';
import { DetectionItem } from './DetectionItem';

export class ImpactItem extends BaseItem<BaseItem<any>> {

    constructor(impact: string, context: vscode.ExtensionContext) {
        super(impact, impact[0].toUpperCase() + impact.slice(1), vscode.TreeItemCollapsibleState.Expanded, context);

        if (impact == "warning") {
            this.iconPath = new vscode.ThemeIcon('warning', new vscode.ThemeColor("notificationsWarningIcon.foreground"));
        } else if (impact == "info") {
            this.iconPath = new vscode.ThemeIcon('info', new vscode.ThemeColor("notificationsInfoIcon.foreground"));
        } else {
            this.setIcon("impact_" + impact);
        }
    }

    addLeaf(leaf: WakeDetection, level?: number) {
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
        super.addLeaf(leaf, level)
    }

}
