import * as vscode from 'vscode';
import { context, log } from './extension'
import { Command, DiagnosticSeverity, integer } from 'vscode-languageclient';
import {
    Diagnostic
} from 'vscode-languageclient/node';

export class WakeDiagnostic extends vscode.Diagnostic {
    data: DiagnosticData

    constructor(range: vscode.Range, message: string, severity: vscode.DiagnosticSeverity, data: DiagnosticData) {
        super(range, message, severity);
        this.data = data;
    }
}

export class WakeDetection {
    uri: vscode.Uri;
    diagnostic: WakeDiagnostic;

    constructor(uri: vscode.Uri, diagnostic: WakeDiagnostic){
        this.uri = uri;
        this.diagnostic = diagnostic;
    }

    getId(): string{
        return [this.uri.toString(), this.diagnostic.message, this.diagnostic.range.start.line, this.diagnostic.range.start.character, this.diagnostic.range.end.line, this.diagnostic.range.end.character].join(":");
    }

    getImpact(): string | undefined{
        log.d(this.diagnostic.data.impact);
        return this.diagnostic.data.impact;
    }
}

export interface DiagnosticData{
    severity: string;
    impact: string;
    confidence: string;
    ignored: boolean;
    sourceUnitName: string;
}

class BaseItem<T extends BaseItem<any>> extends vscode.TreeItem {
    originalLabel: string;
    childs: T[] = [];
    childsMap: Map<string, T> = new Map<string, T>();

    constructor(label: string, collapsibleState: vscode.TreeItemCollapsibleState | undefined){
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

    getId(): string{
        return this.originalLabel;
    }

    setIcon(name: string){
        this.iconPath = {
            light: context.asAbsolutePath("resources/icons/" + name + ".png"),
            dark: context.asAbsolutePath("resources/icons/" + name + ".png"),
        };
    }

    updateLabel() {
        this.label = this.originalLabel + " (" + this.childs.length + ")";
    }
}

class RootItem extends BaseItem<PathItem> {
    key: string;
    leafsCount = 0;

    constructor(type: string, key:string, label: string) {
        super(label, vscode.TreeItemCollapsibleState.Expanded);
        this.key = key;
        this.setIcon(type + "_" + key)
    }

    addLeaf(leaf: WakeDetection) {
        let segments = leaf.diagnostic.data.sourceUnitName.split("/");
        let currentNode: BaseItem<RootItem | PathItem | FileItem> = this;
        let fileNode: FileItem | undefined;

        if (segments.length > 1) {

            for (let i = 0; i < segments.length - 1; i++) {
                let segment = segments[i];
                let childNode: PathItem | FileItem | undefined = currentNode?.childsMap.get(segment);
                if (childNode == undefined) {
                    childNode = new PathItem(segment);
                    currentNode.addChild(childNode);
                }
                currentNode = childNode;
            }
        }
        fileNode = currentNode.getChild(segments[segments.length - 1]) as FileItem
        if (fileNode == undefined) {
            fileNode = new FileItem(leaf.uri);
            currentNode.addChild(fileNode)
        }
        fileNode.addChild(new DetectionItem(leaf));
        this.leafsCount++;
    }

    updateLabel() {
        this.label = this.originalLabel + " (" + this.leafsCount + ")";
    }

    clearChilds(): void {
        super.clearChilds()
        this.leafsCount = 0;
    }
}

class ImpactItem extends RootItem {

    constructor(impact: string) {
        let label: string
        let icon: vscode.ThemeIcon | undefined = undefined
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
                icon = new vscode.ThemeIcon('warning', new vscode.ThemeColor("notificationsWarningIcon.foreground"))
                break;
            default:
                label = "Info"
                icon = new vscode.ThemeIcon('info', new vscode.ThemeColor("notificationsInfoIcon.foreground"))
                break;
        }
        super("impact", impact, label);
        if (icon != undefined) {
            this.iconPath = icon;
        }
    }
}

class SeverityItem extends RootItem {

    constructor(severity: string) {
        let label: string
        let icon: vscode.ThemeIcon
        switch (severity) {
            case "error":
                label = "Error"
                icon = new vscode.ThemeIcon('error', new vscode.ThemeColor("notificationsErrorIcon.foreground"))
                break;
            case "warning":
                label = "Warning"
                icon = new vscode.ThemeIcon('warning', new vscode.ThemeColor("notificationsWarningIcon.foreground"))
                break;
            default:
                label = "Info"
                icon = new vscode.ThemeIcon('info', new vscode.ThemeColor("notificationsInfoIcon.foreground"))
                break;
        }
        super("severity", severity, label);
        this.iconPath = icon;
    }
}

class PathItem extends BaseItem<PathItem | FileItem> {
    constructor(segment: string) {
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
    uri: vscode.Uri;

    constructor(uri: vscode.Uri){
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
        super("L" + (detection.diagnostic.range.start.line + 1) + ": " + detection.diagnostic.message, collapsibleState);
        this.detection = detection;
        this.command = {
            title: "Open",
            command: "Tools-for-Solidity.detections.open_file",
            arguments: [detection.uri, detection.diagnostic.range]
        };

        if(detection.diagnostic.data.impact != undefined){
            this.setIcon("detection_" + detection.diagnostic.data.impact + "_" + detection.diagnostic.data.confidence);
        } else {
            this.setIconBySeverity();
        }
    }

    setIconBySeverity(){
        switch(this.detection.diagnostic.severity){
            case 0:
                this.iconPath = new vscode.ThemeIcon('error', new vscode.ThemeColor("notificationsErrorIcon.foreground"))
                break;
            case 1:
                this.iconPath = new vscode.ThemeIcon('warning', new vscode.ThemeColor("notificationsWarningIcon.foreground"))
                break;
            case 2:
                this.iconPath = new vscode.ThemeIcon('info', new vscode.ThemeColor("notificationsInfoIcon.foreground"))
                break;
            default:
        }
    }
}

export abstract class BaseProvider implements vscode.TreeDataProvider<vscode.TreeItem>{

    detectionsMap: Map<string, WakeDetection[]> = new Map<string, WakeDetection[]>()
    rootNodesMap: Map<string, RootItem> = new Map<string, RootItem>()
    rootNodes: RootItem[] = [];

    _onDidChangeTreeData: vscode.EventEmitter<undefined> = new vscode.EventEmitter<undefined>();
    onDidChangeTreeData: vscode.Event<undefined> = this._onDidChangeTreeData.event;

    addRoot(node: RootItem){
        this.rootNodesMap.set(node.key, node);
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
                let rootNode = this.rootNodesMap.get(this.getRoot(detection.diagnostic));

                if (rootNode != undefined){
                    rootNode.addLeaf(detection);
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

    abstract getRoot(diagnostic: WakeDiagnostic): string;
}

export class WakeDetectionsProvider extends BaseProvider{

    constructor() {
        super()
        this.addRoot(new ImpactItem("high"));
        this.addRoot(new ImpactItem("medium"));
        this.addRoot(new ImpactItem("low"));
        this.addRoot(new ImpactItem("warning"));
        this.addRoot(new ImpactItem("info"));
    }

    getRoot(diagnostic: WakeDiagnostic): string {
        return diagnostic.data.impact;
    }
}

export class SolcDetectionsProvider extends BaseProvider{

    constructor() {
        super()
        this.addRoot(new SeverityItem("error"));
        this.addRoot(new SeverityItem("warning"));
        this.addRoot(new SeverityItem("info"));
    }

    getRoot(diagnostic: WakeDiagnostic): string {
        return diagnostic.data.severity;
    }
}