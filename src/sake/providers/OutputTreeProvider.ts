import * as vscode from 'vscode';
import {
    CallTrace,
    TxDeploymentOutput,
    TxCallOutput,
    TxOutput,
    TxType
} from '../webview/shared/types';

class BaseOutputItem extends vscode.TreeItem {
    children: BaseOutputItem[] = [];

    constructor(public label: string, public collapsibleState: vscode.TreeItemCollapsibleState) {
        super(label, collapsibleState);
    }

    setChildren(children: BaseOutputItem[]): void {
        this.children = children;
    }
}

export class OutputViewManager {
    private static _instance: OutputViewManager;
    private static _context: vscode.ExtensionContext;

    provider: SakeOutputTreeProvider;
    treeView: vscode.TreeView<vscode.TreeItem>;

    private constructor(context: vscode.ExtensionContext) {
        this.provider = new SakeOutputTreeProvider(context);
        this.treeView = vscode.window.createTreeView('sake-output', {
            treeDataProvider: this.provider
        });
        context.subscriptions.push(this.treeView);
    }

    public static initialize(context: vscode.ExtensionContext) {
        if (this._context) {
            throw new Error('OutputViewManager already initialized');
        }
        this._context = context;
    }

    static getInstance() {
        if (!this._context) {
            throw new Error('OutputViewManager not initialized');
        }
        if (!this._instance) {
            this._instance = new OutputViewManager(this._context);
        }
        return this._instance;
    }

    public set(data: TxOutput) {
        this.provider.set(data);
        this._setMessage(data);
    }

    private _setMessage(data: TxOutput): void {
        let _data;
        let message = '';

        switch (data.type) {
            case TxType.Deployment:
                _data = data as TxDeploymentOutput;
                if (_data.success) {
                    message = `✓ Successfully deployed ${_data.contractName}`;

                    break;
                }
                message = `✗ Failed to deploy ${_data.contractName}`;

                break;

            case TxType.FunctionCall:
                _data = data as TxCallOutput;
                if (_data.success) {
                    message = `✓ Successfully called ${buildFunctionString(_data.callTrace)}`;
                    break;
                }
                message = `✗ Failed to call ${buildFunctionString(_data.callTrace)}`;
                break;

            default:
                throw new Error('Invalid TxType');
        }

        this.treeView.message = message;
    }
}

export class SakeOutputItem extends vscode.TreeItem {
    children: BaseOutputItem[] = [];
    key: string;
    value: string | undefined;

    constructor(
        key: string,
        value: string | undefined,
        collapsibleState: vscode.TreeItemCollapsibleState | undefined,
        icon: string | undefined = undefined
    ) {
        const _label = value === undefined ? key : key + ': ' + value;
        super(_label, collapsibleState);

        this.key = key;
        this.value = value;

        if (icon !== undefined) {
            this.iconPath = new vscode.ThemeIcon(icon);
        }

        this.contextValue = this.value === undefined ? undefined : 'copyable';

        // this._setIcon();
    }

    // private _setIcon() {
    //     switch (this.key) {
    //         case 'type':
    //             this.iconPath = new vscode.ThemeIcon('squirrel');
    //             break;
    //         case 'success':
    //             this.iconPath =
    //                 this.value === 'true'
    //                     ? new vscode.ThemeIcon('pass')
    //                     : new vscode.ThemeIcon('stop-circle');
    //             break;
    //         case 'to':
    //             this.iconPath = new vscode.ThemeIcon('arrow-small-right');
    //             break;
    //         case 'from':
    //             this.iconPath = new vscode.ThemeIcon('arrow-small-left');
    //             break;
    //         case 'contractAddress':
    //             this.iconPath = new vscode.ThemeIcon('rocket');
    //             break;
    //         case 'contractName':
    //             this.iconPath = new vscode.ThemeIcon('symbol-key');
    //             break;
    //         case 'receipt':
    //             this.iconPath = new vscode.ThemeIcon('book');
    //             break;
    //         case 'callTrace':
    //             this.iconPath = new vscode.ThemeIcon('list-tree');
    //             break;
    //         default:
    //             this.iconPath = undefined;
    //             break;
    //     }
    // }

    setChildren(children: BaseOutputItem[]): void {
        this.children = children;
    }
}

class SakeOutputTreeProvider implements vscode.TreeDataProvider<vscode.TreeItem> {
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

    set(data: TxOutput) {
        this.rootNodes = this._parseJson(data);
        this.refresh();
    }

    private _parseJson(data: TxOutput): BaseOutputItem[] {
        switch (data.type) {
            case TxType.Deployment:
                return this._parseDeployment(data as TxDeploymentOutput);
            case TxType.FunctionCall:
                return this._parseFunctionCall(data as TxCallOutput);
            default:
                throw new Error('Invalid TxType');
        }
    }

    private _parseDeployment(data: TxDeploymentOutput): BaseOutputItem[] {
        const rootNodes: SakeOutputItem[] = [];

        // parse from
        // if (data.receipt?.from !== undefined) {
        //     rootNodes.push(
        //         new SakeOutputItem(
        //             'From',
        //             data.receipt.from,
        //             vscode.TreeItemCollapsibleState.None,
        //             'arrow-small-left'
        //         )
        //     );
        // }

        // parse contract name
        if (data.receipt?.contractAddress !== undefined) {
            rootNodes.push(
                new SakeOutputItem(
                    'Contract Address',
                    data.receipt.contractAddress,
                    vscode.TreeItemCollapsibleState.None,
                    'rocket'
                )
            );
        }

        // value
        if (
            data.callTrace.value != null &&
            data.callTrace.value !== '0' &&
            data.callTrace.value !== '0 wei'
        ) {
            rootNodes.push(
                new SakeOutputItem(
                    'Value',
                    data.callTrace.value,
                    vscode.TreeItemCollapsibleState.None,
                    'squirrel'
                )
            );
        }

        // add calltrace
        if (data.callTrace !== undefined) {
            const callTraceNode = new SakeOutputItem(
                'Call Trace',
                undefined,
                vscode.TreeItemCollapsibleState.Collapsed,
                'list-tree'
            );
            callTraceNode.setChildren([parseCallTrace(data.callTrace)]);
            rootNodes.push(callTraceNode);
        }

        // add receipt
        if (data.receipt !== undefined) {
            const receiptNode = new SakeOutputItem(
                'Receipt',
                undefined,
                vscode.TreeItemCollapsibleState.Collapsed,
                'book'
            );
            const receiptChildren = Object.keys(data.receipt).map((key) => {
                return new SakeOutputItem(
                    key,
                    data.receipt![key],
                    vscode.TreeItemCollapsibleState.None
                ) as BaseOutputItem;
            });
            receiptNode.setChildren(receiptChildren);
            rootNodes.push(receiptNode);
        }

        return rootNodes as BaseOutputItem[];
    }

    private _parseFunctionCall(data: TxCallOutput): BaseOutputItem[] {
        const rootNodes: SakeOutputItem[] = [];

        // add return data
        if (data.returnData !== undefined) {
            console.log('return Data', data.returnData);
            const hasReturnData = data.returnData.bytes !== '';

            const returnDataNode = new SakeOutputItem(
                'Return Data',
                hasReturnData ? undefined : 'null',
                hasReturnData
                    ? vscode.TreeItemCollapsibleState.Expanded
                    : vscode.TreeItemCollapsibleState.None,
                'file-binary'
            );
            rootNodes.push(returnDataNode);

            // decoded
            if (hasReturnData && data.returnData.decoded !== undefined) {
                const returnDataDecodedNode = new SakeOutputItem(
                    'Decoded',
                    undefined,
                    vscode.TreeItemCollapsibleState.Expanded
                ) as BaseOutputItem;

                returnDataNode.setChildren([...returnDataNode.children, returnDataDecodedNode]);

                const decoded = data.returnData.decoded;

                decoded.forEach((item) => {
                    returnDataDecodedNode.setChildren([
                        new SakeOutputItem(
                            item.name,
                            item.value,
                            vscode.TreeItemCollapsibleState.None
                        ) as BaseOutputItem
                    ]);
                });
            }

            // bytes
            if (hasReturnData && data.returnData.bytes !== undefined) {
                returnDataNode.setChildren([
                    ...returnDataNode.children,
                    new SakeOutputItem(
                        'Bytes',
                        data.returnData.bytes,
                        vscode.TreeItemCollapsibleState.None
                    ) as BaseOutputItem
                ]);
            }
        }

        // value
        if (
            data.callTrace.value != null &&
            data.callTrace.value !== '0' &&
            data.callTrace.value !== '0 wei'
        ) {
            rootNodes.push(
                new SakeOutputItem(
                    'Value',
                    data.callTrace.value,
                    vscode.TreeItemCollapsibleState.None,
                    'squirrel'
                )
            );
        }

        // add calltrace
        if (data.callTrace !== undefined) {
            const callTraceNode = new SakeOutputItem(
                'Call Trace',
                undefined,
                vscode.TreeItemCollapsibleState.Collapsed,
                'list-tree'
            );
            callTraceNode.setChildren([parseCallTrace(data.callTrace)]);
            rootNodes.push(callTraceNode);
        }

        // parse from and to
        // if (data.to !== undefined) {
        //     rootNodes.push(
        //         new SakeOutputItem(
        //             'From',
        //             data.from,
        //             vscode.TreeItemCollapsibleState.None,
        //             'arrow-small-left'
        //         )
        //     );
        // }

        // if (data.from !== undefined) {
        //     rootNodes.push(
        //         new SakeOutputItem(
        //             'To',
        //             data.to,
        //             vscode.TreeItemCollapsibleState.None,
        //             'arrow-small-right'
        //         )
        //     );
        // }

        // add receipt
        if (data.receipt !== undefined) {
            const receiptNode = new SakeOutputItem(
                'Receipt',
                undefined,
                vscode.TreeItemCollapsibleState.Collapsed,
                'book'
            );
            const receiptChildren = Object.keys(data.receipt).map((key) => {
                return new SakeOutputItem(
                    key,
                    data.receipt![key],
                    vscode.TreeItemCollapsibleState.None
                ) as BaseOutputItem;
            });
            receiptNode.setChildren(receiptChildren);
            rootNodes.push(receiptNode);
        }

        return rootNodes as BaseOutputItem[];
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

function parseCallTrace(callTrace: CallTrace) {
    const _parseCallTrace = (callTrace: CallTrace): CallTraceItem => {
        const _string = `${callTrace.status === '✗' ? '✗' : ''}  ${buildFunctionString(callTrace)}`;
        const root = new CallTraceItem(_string);
        if (callTrace.error) {
            root.setChildren([new CallTraceItem(callTrace.error)]);
        } else if (callTrace.subtraces !== undefined) {
            root.setChildren(callTrace.subtraces.map((subtrace) => _parseCallTrace(subtrace)));
        }
        return root;
    };

    const root = _parseCallTrace(callTrace);
    root.updateCollapsibleState();
    return root;
}

/*
 * Call Trace string parser - Deprecated
 */
function parseCallTraceString(callTrace: string): BaseOutputItem {
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

    return root as BaseOutputItem;
}

function buildFunctionString(callTrace: CallTrace, withoutArguments = false): string {
    return `${callTrace.contractName}.${callTrace.functionName}${
        withoutArguments ? '()' : callTrace.arguments
    }`;
}
