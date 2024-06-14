import * as vscode from 'vscode';

class SakeOutputItem extends vscode.TreeItem {
    children: SakeOutputItem[] = [];

    setChildren(children: SakeOutputItem[]): void {
        this.children = children;
    }
}

export class SakeOutputTreeProvider implements vscode.TreeDataProvider<vscode.TreeItem> {

    context: vscode.ExtensionContext;

    _onDidChangeTreeData: vscode.EventEmitter<undefined> = new vscode.EventEmitter<undefined>();
    onDidChangeTreeData: vscode.Event<undefined> = this._onDidChangeTreeData.event;

    rootNodes: SakeOutputItem[] = [];

    constructor(context: vscode.ExtensionContext){
        this.context = context;
    }

    refresh(): void {
        this._onDidChangeTreeData.fire(undefined);
    }

    set(data: any) {
        this.rootNodes = jsonToTree(data);
        this.refresh();
    }

    getTreeItem(element: vscode.TreeItem): vscode.TreeItem {
        return element;
    }

    getChildren(element?: vscode.TreeItem | undefined): vscode.ProviderResult<vscode.TreeItem[]> {
        if (element === undefined) {
            return this.rootNodes;
        }
        return (element as SakeOutputItem).children;
    }
}

function jsonToTree(nodes: any): SakeOutputItem[] {
    const rootNodes: SakeOutputItem[] = [];
    console.log("nodes", nodes);
    Object.entries(nodes).forEach(([key, value]) => {
        console.log("value-key", value, key);
        const node = new SakeOutputItem(key, vscode.TreeItemCollapsibleState.Collapsed);
        if (isObject(value)) {
            const children = jsonToTree(value);
            node.setChildren(children);
        } else if (Array.isArray(value)) {
            const children = value.map((item: any) => {
                return new SakeOutputItem(item, vscode.TreeItemCollapsibleState.None);
            });
            node.setChildren(children);
        } else {
            node.collapsibleState = vscode.TreeItemCollapsibleState.None;
            node.label = `${key}: ${value}`;
        }
        rootNodes.push(node);
    });
    return rootNodes;
}

function isObject(x: any) {
    return typeof x === 'object' && !Array.isArray(x) && x !== null;
}