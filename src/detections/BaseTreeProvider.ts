import * as vscode from 'vscode';
import { BaseItem } from './model/BaseItem';
import { WakeDetection } from './model/WakeDetection';
import { BaseRootItem } from './model/BaseRootItem';


export abstract class BaseTreeProvider implements vscode.TreeDataProvider<vscode.TreeItem> {

    context: vscode.ExtensionContext

    detectionsMap: Map<string, WakeDetection[]> = new Map<string, WakeDetection[]>();
    rootNodesMap: Map<string, BaseRootItem> = new Map<string, BaseRootItem>();
    rootNodes: BaseRootItem[] = [];

    _onDidChangeTreeData: vscode.EventEmitter<undefined> = new vscode.EventEmitter<undefined>();
    onDidChangeTreeData: vscode.Event<undefined> = this._onDidChangeTreeData.event;

    abstract refresh(): void;

    constructor(context: vscode.ExtensionContext){
        this.context = context;
    }

    addRoot(node: BaseRootItem) {
        this.rootNodesMap.set(node.key, node);
        this.rootNodes.push(node);
    }

    add(uri: vscode.Uri, detections: WakeDetection[]) {
        this.detectionsMap.set(uri.toString(), detections);
        this.refresh();
    }

    clear() {
        this.rootNodes = [];
        this.rootNodesMap.clear();
    }

    updateLabels() {
        this.rootNodes.forEach(it => {
            it.updateLabel();
        });
    }

    getTreeItem(element: vscode.TreeItem): vscode.TreeItem | Thenable<vscode.TreeItem> {
        return element;
    }

    getChildren(element?: vscode.TreeItem | undefined): vscode.ProviderResult<vscode.TreeItem[]> {
        let item = (element as BaseItem<any>);
        if (item == undefined) {
            return this.rootNodes;
        }
        else {
            return item.childs;
        }
    }

    sort() {
        this.rootNodes.forEach(it => {
            it.sortChilds();
        });
    }
}
