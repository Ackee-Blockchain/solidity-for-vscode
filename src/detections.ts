import * as vscode from 'vscode';
import { context } from './extension'
import { Command, DiagnosticSeverity, integer } from 'vscode-languageclient';
import {
    Diagnostic
} from 'vscode-languageclient/node';

export class WakeDetection {
    uri: vscode.Uri;
    diagnostic: vscode.Diagnostic;

    constructor(uri : vscode.Uri, diagnostic: vscode.Diagnostic){
        this.uri = uri;
        this.diagnostic = diagnostic;
    }

    getId() : string{
        return [this.uri.toString(), this.diagnostic.message, this.diagnostic.range.start.line, this.diagnostic.range.start.character, this.diagnostic.range.end.line, this.diagnostic.range.end.character].join(":");
    }
}

class BaseItem<T> extends vscode.TreeItem {
    originalLabel: string;
    childs: T[] = [];
    childsMap: Map<string, T> = new Map<string, T>();

    constructor(label : string, collapsibleState : vscode.TreeItemCollapsibleState | undefined){
        super(label, collapsibleState);
        this.originalLabel = label
    }

    addChild(id: string, item: T){
        this.childsMap.set(id, item);
        this.childs.push(item);
    }

    getChild(id: string): T | undefined{
        return this.childsMap.get(id);
    }

    clearChilds() {
        this.childsMap.clear()
        while (this.childs.length != 0) {
            this.childs.pop();
        }
    }

    setIcon(name : string){
        this.iconPath = {
            light: context.asAbsolutePath("resources/icons/" + name + ".png"),
            dark: context.asAbsolutePath("resources/icons/" + name + ".png"),
        };
    }

    updateLabel() {
        this.label = this.originalLabel + " (" + this.childs.length + ")";
    }
}

class ImpactItem extends BaseItem<FileItem> {
    impact: string;

    constructor(impact: string) {
        let label: string
        switch (impact) {
            case "high":
                label = "High"
                break;
            case "medium":
                label = "Medium"
                break;
            case "low":
                label = "Low"
                break;
            case "warning":
                label = "Warning"
                break;
            case "info":
                label = "Info"
                break;
            default:
                label = "All"
                break;
        }
        super(label, vscode.TreeItemCollapsibleState.Expanded);
        this.originalLabel = label
        this.impact = impact;
        this.setIcon("impact_" + impact)
    }

    updateLabel() {
        let detectionsCount = 0;
        this.childs.forEach( it => {
            detectionsCount += it.childs.length
        })
        this.label = this.originalLabel + " (" + detectionsCount + ")";     
    }
}

class FileItem extends BaseItem<DetectionItem> {
    uri : vscode.Uri;

    constructor(uri : vscode.Uri){
        super(uri.path.substring(uri.path.lastIndexOf("/") + 1), vscode.TreeItemCollapsibleState.Collapsed);
        this.uri = uri;
    }

    addChild(id: string, item: DetectionItem) {
        super.addChild(id, item);
        this.childs.sort((a: DetectionItem, b: DetectionItem) => {
            if (a.detection.diagnostic.range.start.line > b.detection.diagnostic.range.start.line){
                return 1;
            }
            else if (a.detection.diagnostic.range.start.line < b.detection.diagnostic.range.start.line) {
                return -1;
            } else {
                if (a.detection.diagnostic.range.start.character > b.detection.diagnostic.range.start.character) {
                    return 1;
                }
                else if (a.detection.diagnostic.range.start.character < b.detection.diagnostic.range.start.character) {
                    return -1;
                } else {
                    return 0;
                }
            }
        });
    }
}

class DetectionItem extends BaseItem<any> {

    detection: WakeDetection;

    constructor(detection: WakeDetection, collapsibleState?: vscode.TreeItemCollapsibleState) {
        super("[Ln " + detection.diagnostic.range.start.line + "] " + detection.diagnostic.message, collapsibleState);
        this.detection = detection;
        this.command = {
            title: "Open",
            command: "Tools-for-Solidity.detections.open_file",
            arguments: [detection.uri, detection.diagnostic.range]
        };
    }
}

export class DetectionsProvider implements vscode.TreeDataProvider<vscode.TreeItem>{

    outputChannel: vscode.OutputChannel;
    detectionsMap: Map<vscode.Uri, WakeDetection[]> = new Map<vscode.Uri, WakeDetection[]>()
    rootNodesMap: Map<string, ImpactItem> = new Map<string, ImpactItem>()
    rootNodes: ImpactItem[] = [];

    _onDidChangeTreeData: vscode.EventEmitter<undefined> = new vscode.EventEmitter<undefined>();
    onDidChangeTreeData: vscode.Event<undefined> = this._onDidChangeTreeData.event;

    constructor(outputChannel: vscode.OutputChannel){
        this.outputChannel = outputChannel;
    }

    addRoot(node: ImpactItem){
        this.rootNodesMap.set(node.impact, node);
        this.rootNodes.push(node);
    }

    add(uri: vscode.Uri, detections: WakeDetection[]){
        this.detectionsMap.set(uri, detections);
        this.refresh();
    }

    refresh(){
        this.rootNodes.forEach( it => {
            it.clearChilds();
        })

        for (const [key, value] of this.detectionsMap) {
            value.forEach(detection => {

                let impact : string;
                switch (detection.diagnostic.severity) {
                    case 0:
                        impact = "high"
                        break;
                    case 1:
                        impact = "medium"
                        break;
                    case 2:
                        impact = "low"
                        break;
                    case 3:
                        impact = "warning"
                        break;
                    default:
                        impact = "info"
                        break;
                }

                let rootNode = this.rootNodesMap.get(impact)

                if (rootNode != undefined){
                    let fileItem = rootNode.getChild(detection.uri.toString());
                    if (fileItem == undefined){
                        fileItem = new FileItem(detection.uri);
                        rootNode.addChild(detection.uri.toString(), fileItem);
                    }
                    fileItem.addChild(detection.getId(), new DetectionItem(detection));
                }
                
            })
        }
        this.updateRootLabels();
        this._onDidChangeTreeData.fire(undefined);
    }

    updateRootLabels(){
        this.rootNodes.forEach(it => {
            it.updateLabel();
            it.childs.forEach(it =>{
                it.updateLabel();
            })
        })
    }

    getTreeItem(element: vscode.TreeItem): vscode.TreeItem | Thenable<vscode.TreeItem> {
        return element;
    }

    getChildren(element?: vscode.TreeItem | undefined): vscode.ProviderResult<vscode.TreeItem[]> {
        let item = (element as BaseItem<any>)
        if (item == undefined){
            return this.rootNodes;
        } 
        else {
            return item.childs;
        }
    }
    
}

export class WakeDetectionsProvider extends DetectionsProvider {
    constructor(outputChannel: vscode.OutputChannel) {
        super(outputChannel);
        this.addRoot(new ImpactItem("high"));
        this.addRoot(new ImpactItem("medium"));
        this.addRoot(new ImpactItem("low"));
        this.addRoot(new ImpactItem("warning"));
        this.addRoot(new ImpactItem("info"));
    }
}