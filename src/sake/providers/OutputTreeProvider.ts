import * as vscode from 'vscode';
import { SakeContext } from '../context';
import {
    CallOperation,
    TransactionCallResult,
    TransactionDecodedReturnValue,
    TransactionDeploymentResult,
    TransactionResult,
    WakeCallTrace
} from '../webview/shared/types';

class BaseOutputItem extends vscode.TreeItem {
    children: BaseOutputItem[] = [];

    constructor(
        public label: string,
        public collapsibleState: vscode.TreeItemCollapsibleState
    ) {
        super(label, collapsibleState);
    }

    setChildren(children: BaseOutputItem[]): void {
        this.children = children;
    }
}

export class OutputViewManager {
    private static _instance: OutputViewManager;
    private _outputViewId: string = 'sake-output';

    provider: SakeOutputTreeProvider;
    treeView: vscode.TreeView<vscode.TreeItem>;

    private constructor() {
        this.provider = new SakeOutputTreeProvider();
        this.treeView = vscode.window.createTreeView(this._outputViewId, {
            treeDataProvider: this.provider
        });
        this._context.subscriptions.push(this.treeView);
        this.treeView.message = ''; // override left over message from previous extension run
    }

    private get _context(): vscode.ExtensionContext {
        const _context = SakeContext.getInstance().context;
        if (_context === undefined) {
            throw Error();
        }
        return _context;
    }

    static getInstance() {
        if (!this._instance) {
            this._instance = new OutputViewManager();
        }
        return this._instance;
    }

    public set(data: TransactionResult) {
        this.provider.set(data);
        this._setMessage(data);
        vscode.commands.executeCommand(`${this._outputViewId}.focus`);
    }

    private _setMessage(data: TransactionResult): void {
        let _data;
        let message = '';

        switch (data.type) {
            case CallOperation.Deployment:
                _data = data as TransactionDeploymentResult;
                if (_data.success) {
                    message = `✓ Successfully deployed ${_data.contractName}`;

                    break;
                }
                message = `✗ Failed to deploy ${_data.contractName}`;

                break;

            case CallOperation.FunctionCall:
                _data = data as TransactionCallResult;
                const _called = _data.callTrace
                    ? buildFunctionString(_data.callTrace)
                    : _data.functionName;
                if (_data.success) {
                    message = `✓ Successfully called ${_called}`;
                    break;
                }
                message = `✗ Reverted call to ${_called}`;
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

        if (icon != null) {
            this.iconPath = new vscode.ThemeIcon(icon, new vscode.ThemeColor('foreground'));
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
    _onDidChangeTreeData: vscode.EventEmitter<undefined> = new vscode.EventEmitter<undefined>();
    onDidChangeTreeData: vscode.Event<undefined> = this._onDidChangeTreeData.event;

    rootNodes: BaseOutputItem[] = [];

    constructor() {}

    refresh(): void {
        this._onDidChangeTreeData.fire(undefined);
    }

    set(data: TransactionResult) {
        this.rootNodes = this._parseJson(data);
        this.refresh();
    }

    private _parseJson(data: TransactionResult): BaseOutputItem[] {
        switch (data.type) {
            case CallOperation.Deployment:
                return this._parseDeployment(data as TransactionDeploymentResult);
            case CallOperation.FunctionCall:
                return this._parseFunctionCall(data as TransactionCallResult);
            default:
                throw new Error('Invalid TxType');
        }
    }

    private _parseDeployment(data: TransactionDeploymentResult): BaseOutputItem[] {
        const rootNodes: SakeOutputItem[] = [];

        // parse from
        // if (data.receipt?.from != null) {
        //     rootNodes.push(
        //         new SakeOutputItem(
        //             'From',
        //             data.receipt.from,
        //             vscode.TreeItemCollapsibleState.None,
        //             'arrow-small-left'
        //         )
        //     );
        // }

        if (data.success) {
            // parse contract name
            if (data.receipt?.contractAddress != null) {
                rootNodes.push(
                    new SakeOutputItem(
                        'Contract Address',
                        data.receipt.contractAddress,
                        vscode.TreeItemCollapsibleState.None,
                        'rocket'
                    )
                );
            }
        } else {
            // parse error
            if (data.error) {
                rootNodes.push(
                    new SakeOutputItem(
                        'Error',
                        data.error,
                        vscode.TreeItemCollapsibleState.None,
                        'error'
                    )
                );
            }
        }

        // value
        if (
            data.callTrace?.value != null &&
            data.callTrace?.value !== '0' &&
            data.callTrace?.value !== '0 wei'
        ) {
            rootNodes.push(
                new SakeOutputItem(
                    'Value',
                    data.callTrace?.value,
                    vscode.TreeItemCollapsibleState.None,
                    'squirrel'
                )
            );
        }

        // add calltrace
        if (data.callTrace != null) {
            const callTraceNode = new SakeOutputItem(
                'Call Trace',
                undefined,
                vscode.TreeItemCollapsibleState.Collapsed,
                'list-tree'
            );
            callTraceNode.setChildren([parseCallTrace(data.callTrace)]);
            rootNodes.push(callTraceNode);
        }

        // add events
        if (data.events != null && data.events.length > 0) {
            const eventsNode = new SakeOutputItem(
                'Events',
                undefined,
                vscode.TreeItemCollapsibleState.Collapsed,
                'symbol-event'
            );

            eventsNode.setChildren(
                data.events.map(
                    (event) =>
                        new SakeOutputItem(
                            event,
                            undefined,
                            vscode.TreeItemCollapsibleState.None
                        ) as BaseOutputItem
                )
            );

            rootNodes.push(eventsNode);
        }

        // add receipt
        if (data.receipt != null) {
            const receiptNode = new SakeOutputItem(
                'Receipt',
                undefined,
                vscode.TreeItemCollapsibleState.Collapsed,
                'book'
            );
            const receiptChildren = Object.keys(data.receipt).map((key) => {
                return new SakeOutputItem(
                    key,
                    (data.receipt as any)[key],
                    vscode.TreeItemCollapsibleState.None
                ) as BaseOutputItem;
            });
            receiptNode.setChildren(receiptChildren);
            rootNodes.push(receiptNode);
        }

        return rootNodes as BaseOutputItem[];
    }

    private _parseFunctionCall(data: TransactionCallResult): BaseOutputItem[] {
        const rootNodes: SakeOutputItem[] = [];

        if (data.success) {
            // add return data
            if (data.returnData != null) {
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
                if (hasReturnData && data.returnData.decoded != null) {
                    const returnDataDecodedNode = new SakeOutputItem(
                        'Decoded',
                        undefined,
                        vscode.TreeItemCollapsibleState.Expanded
                    ) as BaseOutputItem;

                    returnDataNode.setChildren([...returnDataNode.children, returnDataDecodedNode]);

                    const decoded = data.returnData.decoded;

                    decoded.forEach((item) => {
                        returnDataDecodedNode.setChildren([
                            ...returnDataDecodedNode.children,
                            parseDecodedObject(item)
                        ]);
                    });
                }

                // bytes
                if (hasReturnData && data.returnData.bytes != null) {
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
        } else {
            if (data.error) {
                rootNodes.push(
                    new SakeOutputItem(
                        'Error',
                        data.error,
                        vscode.TreeItemCollapsibleState.None,
                        'error'
                    )
                );
            }
        }

        // value
        if (
            data.callTrace?.value != null &&
            data.callTrace?.value !== '0' &&
            data.callTrace?.value !== '0 wei'
        ) {
            rootNodes.push(
                new SakeOutputItem(
                    'Value',
                    data.callTrace?.value,
                    vscode.TreeItemCollapsibleState.None,
                    'squirrel'
                )
            );
        }

        // add calltrace
        if (data.callTrace != null) {
            const callTraceNode = new SakeOutputItem(
                'Call Trace',
                undefined,
                vscode.TreeItemCollapsibleState.Collapsed,
                'list-tree'
            );
            callTraceNode.setChildren([parseCallTrace(data.callTrace)]);
            rootNodes.push(callTraceNode);
        }

        // add events
        if (data.events != null && data.events.length > 0) {
            const eventsNode = new SakeOutputItem(
                'Events',
                undefined,
                vscode.TreeItemCollapsibleState.Collapsed,
                'symbol-event'
            );

            eventsNode.setChildren(
                data.events.map(
                    (event) =>
                        new SakeOutputItem(
                            event,
                            undefined,
                            vscode.TreeItemCollapsibleState.None
                        ) as BaseOutputItem
                )
            );

            rootNodes.push(eventsNode);
        }

        // parse from and to
        // if (data.to != null) {
        //     rootNodes.push(
        //         new SakeOutputItem(
        //             'From',
        //             data.from,
        //             vscode.TreeItemCollapsibleState.None,
        //             'arrow-small-left'
        //         )
        //     );
        // }

        // if (data.from != null) {
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
        if (data.receipt != null) {
            const receiptNode = new SakeOutputItem(
                'Receipt',
                undefined,
                vscode.TreeItemCollapsibleState.Collapsed,
                'book'
            );
            const receiptChildren = Object.keys(data.receipt).map((key) => {
                return new SakeOutputItem(
                    key,
                    (data.receipt as any)[key],
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
    children: (CallTraceItem | CallTraceEventItem)[] = [];

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
                if (child instanceof CallTraceItem) {
                    child.updateCollapsibleState();
                }
            });
            return;
        }
        this.collapsibleState = vscode.TreeItemCollapsibleState.None;
    }
}

class CallTraceEventItem extends BaseOutputItem {
    constructor(public label: string) {
        super(label, vscode.TreeItemCollapsibleState.None);
        this.iconPath = new vscode.ThemeIcon('symbol-event', new vscode.ThemeColor('foreground'));
    }
}

function parseCallTrace(callTrace: WakeCallTrace) {
    const _parseCallTrace = (callTrace: WakeCallTrace): CallTraceItem => {
        const _string = `${callTrace.status === '✗' ? '✗' : ''}  ${buildFunctionString(callTrace)}`;
        const root = new CallTraceItem(_string);
        if (callTrace.error) {
            root.setChildren([new CallTraceItem(callTrace.error)]);
        } else if (callTrace.subtraces != null) {
            root.setChildren(callTrace.subtraces.map((subtrace: any) => _parseCallTrace(subtrace)));
        }
        // add events
        if (callTrace.events != null) {
            root.setChildren([
                ...root.children,
                ...callTrace.events.map((event) => new CallTraceEventItem(event))
            ]);
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

function buildFunctionString(callTrace: WakeCallTrace, withoutArguments = false): string {
    return `${callTrace.contractName}.${callTrace.functionName}${
        withoutArguments ? '()' : callTrace.arguments
    }`;
}

function parseDecodedObject(item: TransactionDecodedReturnValue): BaseOutputItem {
    const needsDestructuring = item.children != null;

    const destructured = new SakeOutputItem(
        item.name,
        needsDestructuring ? undefined : item.value?.toString(),
        needsDestructuring
            ? vscode.TreeItemCollapsibleState.Expanded
            : vscode.TreeItemCollapsibleState.None
    ) as BaseOutputItem;

    if (item.children != null) {
        destructured.setChildren(item.children.map((child) => parseDecodedObject(child)));
    }

    return destructured;
}
