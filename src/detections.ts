import * as vscode from 'vscode';
import { context, log } from './extension'
import { Command, DiagnosticSeverity, integer } from 'vscode-languageclient';
import {
    Diagnostic
} from 'vscode-languageclient/node';

export class WakeDiagnostic extends vscode.Diagnostic{
    data : DiagnosticData

    constructor(range: vscode.Range, message: string, severity: vscode.DiagnosticSeverity, data : DiagnosticData){
        super(range, message, severity);
        this.data = data;
    }
}

export class WakeDetection {
    uri: vscode.Uri;
    diagnostic: WakeDiagnostic;

    constructor(uri : vscode.Uri, diagnostic: WakeDiagnostic){
        this.uri = uri;
        this.diagnostic = diagnostic;
    }

    getId() : string{
        return [this.uri.toString(), this.diagnostic.message, this.diagnostic.range.start.line, this.diagnostic.range.start.character, this.diagnostic.range.end.line, this.diagnostic.range.end.character].join(":");
    }

    getImpact() : string | undefined{
        log.d(this.diagnostic.data.impact);
        return this.diagnostic.data.impact;
    }
}

export interface DiagnosticData{
    impact : string;
    confidence : string;
    ignored : boolean;
    sourceUnitName: string;
}

class BaseItem<T extends BaseItem<any>> extends vscode.TreeItem {
    originalLabel: string;
    childs: T[] = [];
    childsMap: Map<string, T> = new Map<string, T>();

    constructor(label : string, collapsibleState : vscode.TreeItemCollapsibleState | undefined){
        super(label, collapsibleState);
        this.originalLabel = label
    }

    addChild(item: T){
        this.childsMap.set(item.getId(), item);
        this.childs.push(item);
    }

    getChild(id: string): T | undefined{
        return this.childsMap.get(id);
    }

    sortChilds(){
        this.childs.forEach(it => {
            it.sortChilds();
        })
    }

    clearChilds() {
        this.childsMap.clear()
        while (this.childs.length != 0) {
            this.childs.pop();
        }
    }

    getId() : string{
        return this.originalLabel;
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

class ImpactItem extends BaseItem<PathItem> {
    impact: string;
    detectionsCount = 0;

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
        this.impact = impact;
        this.setIcon("impact_" + impact)
    }

    addDetection(detection : WakeDetection){
        let segments = detection.diagnostic.data.sourceUnitName.split("/");
        let currentNode : BaseItem<ImpactItem | PathItem | FileItem> = this;
        let fileNode : FileItem | undefined;

        if(segments.length > 1){

            for (let i = 0; i < segments.length-1; i++) {
                let segment = segments[i];
                let childNode : PathItem | FileItem | undefined = currentNode?.childsMap.get(segment);
                if (childNode == undefined){
                    childNode = new PathItem(segment);
                    currentNode.addChild(childNode);
                }
                currentNode = childNode;
            }
        }
        fileNode = currentNode.getChild(segments[segments.length - 1]) as FileItem
        if (fileNode == undefined) {
            fileNode = new FileItem(detection.uri);
            currentNode.addChild(fileNode)
        }
        fileNode.addChild(new DetectionItem(detection));
        this.detectionsCount++;
    }

    updateLabel() {
        this.label = this.originalLabel + " (" + this.detectionsCount + ")";
    }

    clearChilds(): void {
        super.clearChilds()
        this.detectionsCount = 0;
    }
}

class SeverityItem extends BaseItem<FileItem> {
    severity: integer;

    constructor(severity: integer) {
        let label: string
        switch (severity) {
            case 1:
                label = "Error"
                break;
            case 2:
                label = "Warning"
                break;
            case 3:
                label = "Info"
                break;
            default:
                label = "Hide"
                break;
        }
        super(label, vscode.TreeItemCollapsibleState.Expanded);
        this.severity = severity;
        this.setIcon("severity_" + severity)
    }

    updateLabel() {
        let detectionsCount = 0;
        this.childs.forEach( it => {
            detectionsCount += it.childs.length
        })
        this.label = this.originalLabel + " (" + detectionsCount + ")";     
    }
}

class PathItem extends BaseItem<PathItem | FileItem> {
    constructor(segment : string) {
        super(segment, vscode.TreeItemCollapsibleState.Expanded);
        this.setIcon("folder");
    }

    addChild(item: PathItem | FileItem): void {
        super.addChild(item)
    }

    sortChilds(): void {
        this.childs.sort((a: PathItem | FileItem, b: PathItem | FileItem) => {
            if (a instanceof PathItem && b instanceof FileItem){
                return -1;
            } else if (a instanceof FileItem && b instanceof PathItem) {
                return 1;
            } else {
                return a.originalLabel.localeCompare(b.originalLabel)
            }
        })
        super.sortChilds();
    }
}

class FileItem extends BaseItem<DetectionItem> {
    uri : vscode.Uri;

    constructor(uri : vscode.Uri){
        super(uri.path.substring(uri.path.lastIndexOf("/") + 1), vscode.TreeItemCollapsibleState.Expanded);
        this.uri = uri;
        this.setIcon("solidity");
    }

    addChild(item: DetectionItem) {
        super.addChild(item);
    }

    sortChilds(): void {
        this.childs.sort((a: DetectionItem, b: DetectionItem) => {
            if (a.detection.diagnostic.range.start.line > b.detection.diagnostic.range.start.line) {
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
        super("L" + detection.diagnostic.range.start.line + ": " + detection.diagnostic.message, collapsibleState);
        this.detection = detection;
        this.command = {
            title: "Open",
            command: "Tools-for-Solidity.detections.open_file",
            arguments: [detection.uri, detection.diagnostic.range]
        };
        this.setIcon("detection_" + detection.diagnostic.data.impact + "_" + detection.diagnostic.data.confidence);
    }
}

export class DetectionsProvider implements vscode.TreeDataProvider<vscode.TreeItem>{

    outputChannel: vscode.OutputChannel;
    detectionsMap: Map<string, WakeDetection[]> = new Map<string, WakeDetection[]>()
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
        this.detectionsMap.set(uri.toString(), detections);
        this.refresh();
    }

    refresh(){
        this.rootNodes.forEach( it => {
            it.clearChilds();
        })

        for (const [key, value] of this.detectionsMap) {
            value.forEach(detection => {
                let rootNode = this.rootNodesMap.get(detection.diagnostic.data.impact)

                if (rootNode != undefined){
                    rootNode.addDetection(detection);
                    //let child = rootNode.getChild(detection.uri.toString());
                    //if (fileItem == undefined){
                    //    fileItem = new FileItem(detection.uri);
                    //    rootNode.addChild(detection.uri.toString(), fileItem);
                    // }
                    // fileItem.addChild(detection.getId(), new DetectionItem(detection));
                }
                
            })
        }

        this.rootNodes.forEach( it => {
            it.sortChilds();
        })

        this.updateRootLabels();
        this._onDidChangeTreeData.fire(undefined);
    }

    updateRootLabels(){
        this.rootNodes.forEach(it => {
            it.updateLabel();
            //it.childs.forEach(it =>{
            //   it.updateLabel();
            //})
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