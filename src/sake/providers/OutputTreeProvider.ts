import * as vscode from 'vscode';

class SakeOutputItem extends vscode.TreeItem {
    children: SakeOutputItem[] = [];
    key: string;
    value: string | undefined;

    constructor(key: string, value: string | undefined, collapsibleState: vscode.TreeItemCollapsibleState | undefined) {
        const _label = value === undefined ? key : key + ": " + value;
        super(_label, collapsibleState);

        this.key = key;
        this.value = value;

        this._setIcon();
    }

    private _setIcon() {
        switch (this.key) {
            case 'type':
                this.iconPath = new vscode.ThemeIcon('squirrel');
                break;
            case 'success':
                this.iconPath = this.value === "true" ? new vscode.ThemeIcon('pass') : new vscode.ThemeIcon('stop-circle');
                break;
            case 'to':
                this.iconPath = new vscode.ThemeIcon('arrow-small-right');
                break;
            case 'from':
                this.iconPath = new vscode.ThemeIcon('arrow-small-left');
                break;
            case 'contractAddress':
                this.iconPath = new vscode.ThemeIcon('rocket');
                break;
            case 'contractName':
                this.iconPath = new vscode.ThemeIcon('symbol-key');
                break;
            case 'receipt':
                this.iconPath = new vscode.ThemeIcon('book');
                break;
            case 'callTrace':
                this.iconPath = new vscode.ThemeIcon('list-tree');
                break;
            default:
                this.iconPath = undefined;
                break;
        }
    }


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
    // console.log("nodes", nodes);
    Object.entries(nodes).forEach(([key, value]) => {
        // console.log("value-key", value, key);
        const node = new SakeOutputItem(key, undefined, vscode.TreeItemCollapsibleState.Collapsed);
        if (isObject(value)) {
            const children = jsonToTree(value);
            node.setChildren(children);
        } else if (Array.isArray(value)) {
            const children = value.map((item: any) => {
                return new SakeOutputItem(item, undefined, vscode.TreeItemCollapsibleState.None);
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