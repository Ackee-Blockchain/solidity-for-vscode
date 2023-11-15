import * as vscode from "vscode";
import { WakeDetection } from './WakeDetection';

export abstract class BaseItem<T extends BaseItem<any>> extends vscode.TreeItem {
    context: vscode.ExtensionContext
    key: string;
    originalLabel: string;
    childs: T[] = [];
    parent: BaseItem<any> | undefined;
    childsMap: Map<string, T> = new Map<string, T>();
    leafsCount = 0;

    constructor(key: string, label: string, collapsibleState: vscode.TreeItemCollapsibleState | undefined, context: vscode.ExtensionContext) {
        super(label, collapsibleState);
        this.context = context;
        this.key = key;
        this.originalLabel = label;
    }

    addChild(item: T) {
        item.parent = this;
        this.childsMap.set(item.getId(), item);
        this.childs.push(item);
    }

    getChild(id: string): T | undefined {
        return this.childsMap.get(id);
    }

    sortChilds() {
        this.childs.forEach(it => {
            it.sortChilds();
        });
    }

    clearChilds() {
        this.childsMap.clear();
        while (this.childs.length != 0) {
            this.childs.pop();
        }
        this.leafsCount = 0;
    }

    addLeaf(leaf: WakeDetection, level?: number) {
        this.leafsCount += 1;
    }

    getId(): string {
        return this.originalLabel;
    }

    setIcon(name: string) {
        this.iconPath = {
            light: this.context.asAbsolutePath("resources/icons/" + name + ".png"),
            dark: this.context.asAbsolutePath("resources/icons/" + name + ".png"),
        };
    }

    updateLabel() {
        if (this.parent == undefined) {
            this.label = this.originalLabel + " (" + this.leafsCount + ")";
        }
        // super.updateChildLabels();
    }

    updateChildLabels() {
        this.childs.forEach(it => {
            it.updateChildLabels();
        });
    }
}
