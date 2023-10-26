import * as vscode from 'vscode';
import { BaseRootItem } from './BaseRootItem';
import { WakeDetection } from './WakeDetection';
import { PathItem } from './PathItem';

export class ImpactItem extends BaseRootItem {

    constructor(impact: string, context: vscode.ExtensionContext) {
        super(impact, impact[0].toUpperCase() + impact.slice(1), context);

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
        if (segments.length > 1) {
            let childNode = this.childsMap.get(segments[0]);
            if (childNode == undefined) {
                childNode = new PathItem(segments[0], this.context);
                this.addChild(childNode);
            }
            childNode.addLeaf(leaf, 1)
            super.addLeaf(leaf, level)
        }
    }

}
