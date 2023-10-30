import * as vscode from 'vscode';
import { BaseItem } from './BaseItem';

export abstract class BaseRootItem extends BaseItem<any> {
    key: string;

    constructor(key: string, label: string, context: vscode.ExtensionContext) {
        super(label, vscode.TreeItemCollapsibleState.Expanded, context);
        this.key = key;
    }

    updateLabel() {
        if (this.parent == undefined) {
            this.label = this.originalLabel + " (" + this.leafsCount + ")";
        }
        // super.updateChildLabels();
    }

    clearChilds(): void {
        super.clearChilds();
        this.leafsCount = 0;
    }
}
