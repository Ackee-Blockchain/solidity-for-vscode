import * as vscode from 'vscode';

// @dev class instead of interface so we can loop over its keys

class BaseOutputItem extends vscode.TreeItem {
    children: BaseOutputItem[] = [];

    constructor(public label: string, public collapsibleState: vscode.TreeItemCollapsibleState) {
        super(label, collapsibleState);
    }

    setChildren(children: BaseOutputItem[]): void {
        this.children = children;
    }
}

class SakeOutputItem extends vscode.TreeItem {
    children: BaseOutputItem[] = [];
    key: string;
    value: string | undefined;

    constructor(
        key: string,
        value: string | undefined,
        collapsibleState: vscode.TreeItemCollapsibleState | undefined
    ) {
        const _label = value === undefined ? key : key + ': ' + value;
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
                this.iconPath =
                    this.value === 'true'
                        ? new vscode.ThemeIcon('pass')
                        : new vscode.ThemeIcon('stop-circle');
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

    setChildren(children: BaseOutputItem[]): void {
        this.children = children;
    }
}

export class SakeOutputTreeProvider implements vscode.TreeDataProvider<vscode.TreeItem> {
    context: vscode.ExtensionContext;

    _onDidChangeTreeData: vscode.EventEmitter<undefined> = new vscode.EventEmitter<undefined>();
    onDidChangeTreeData: vscode.Event<undefined> = this._onDidChangeTreeData.event;

    rootNodes: BaseOutputItem[] = [];

    constructor(context: vscode.ExtensionContext) {
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

function jsonToTree(json: any): BaseOutputItem[] {
    console.log(json);
    const rootNodes: SakeOutputItem[] = [];

    // parse from and to
    if (json.to !== undefined) {
        rootNodes.push(new SakeOutputItem('From', json.from, vscode.TreeItemCollapsibleState.None));
    }

    if (json.from !== undefined) {
        rootNodes.push(new SakeOutputItem('To', json.to, vscode.TreeItemCollapsibleState.None));
    }

    // add receipt
    if (json.receipt !== undefined) {
        const receiptNode = new SakeOutputItem(
            'Receipt',
            undefined,
            vscode.TreeItemCollapsibleState.Collapsed
        );
        const receiptChildren = Object.keys(json.receipt).map((key) => {
            return new SakeOutputItem(
                key,
                json.receipt[key],
                vscode.TreeItemCollapsibleState.None
            ) as BaseOutputItem;
        });
        receiptNode.setChildren(receiptChildren);
        rootNodes.push(receiptNode);
    }

    // add calltrace
    if (json.callTrace !== undefined) {
        const callTraceNode = new SakeOutputItem(
            'Call Trace',
            undefined,
            vscode.TreeItemCollapsibleState.Collapsed
        );
        const callTraceChildren = [parseCallTrace(json.callTrace)];
        callTraceNode.setChildren(callTraceChildren);
        rootNodes.push(callTraceNode);
    }

    // Object.keys(new OutputCall()).map((key) => {
    //     if (json[key] !== undefined) {
    //         const node = new SakeOutputItem(key, json[key], vscode.TreeItemCollapsibleState.None);
    //         rootNodes.push(node);
    //     }
    // });

    // Object.entries(nodes).forEach(([key, value]) => {
    //     // console.log("value-key", value, key);
    //     const node = new SakeOutputItem(key, undefined, vscode.TreeItemCollapsibleState.Collapsed);
    //     if (isObject(value)) {
    //         const children = jsonToTree(value);
    //         node.setChildren(children);
    //     } else if (Array.isArray(value)) {
    //         const children = value.map((item: any) => {
    //             return new SakeOutputItem(item, undefined, vscode.TreeItemCollapsibleState.None);
    //         });
    //         node.setChildren(children);
    //     } else {
    //         node.collapsibleState = vscode.TreeItemCollapsibleState.None;
    //         node.label = `${key}: ${value}`;
    //     }
    //     rootNodes.push(node);
    // });

    return rootNodes as BaseOutputItem[];
}

function isObject(x: any) {
    return typeof x === 'object' && !Array.isArray(x) && x !== null;
}

class CallTraceItem extends BaseOutputItem {
    children: CallTraceItem[] = [];

    constructor(public label: string) {
        super(label, vscode.TreeItemCollapsibleState.None);
    }

    public addChild(children: CallTraceItem): void {
        this.children.push(children);
    }

    public updateCollapsibleState(): void {
        if (this.children.length > 0) {
            this.collapsibleState = vscode.TreeItemCollapsibleState.Expanded;
            this.children.forEach((child) => {
                child.updateCollapsibleState();
            });
            return;
        }
        this.collapsibleState = vscode.TreeItemCollapsibleState.None;
    }
}

function parseCallTrace(callTrace: string): BaseOutputItem {
    const lines = callTrace.split('\n');
    const root = new CallTraceItem(lines[0]);
    const mostRecentNodesPerLevel: { [level: number]: CallTraceItem } = { 0: root };

    let _temp = root;
    for (let i = 1; i < lines.length; i++) {
        // level is counted by occurence of ├ or └
        const _line = lines[i];
        const _match = _line.match(/^[ └├│─]+/g);
        const _level = _match && _match.length === 1 ? Math.floor(_match[0].length / 4) : 0;
        const _isNewItem = _line.match(/[└├]+/g) !== null;
        const _string = _line.slice(4 * _level);

        // console.log(_line, level, isNewItem, _temp, _line.match(/^[ └├│─]+/g));

        if (_level === 0) {
            continue;
        }

        if (!_isNewItem) {
            _temp.label += _line.slice(4 * _level);
            continue;
        }

        const _node = new CallTraceItem(_string);
        mostRecentNodesPerLevel[_level - 1].addChild(_node);
        mostRecentNodesPerLevel[_level] = _node;
        _temp = _node;
    }

    root.updateCollapsibleState();

    console.log('root', root);

    return root as BaseOutputItem;
}
