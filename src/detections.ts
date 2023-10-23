import * as vscode from 'vscode';
import { Log, context, log } from './extension'
import { Command, DiagnosticSeverity, integer } from 'vscode-languageclient';
import {
    Diagnostic
} from 'vscode-languageclient/node';
import { filter } from '@renovatebot/pep440';

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

abstract class BaseItem<T extends BaseItem<any>> extends vscode.TreeItem {
    originalLabel: string;
    childs: T[] = [];
    childsMap: Map<string, T> = new Map<string, T>();
    leafsCount = 0;

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

    addLeaf(leaf: WakeDetection, level?: number) {
        this.leafsCount += 1;
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

abstract class RootItem extends BaseItem<any> {
    key: string;

    constructor(key:string, label: string) {
        super(label, vscode.TreeItemCollapsibleState.Expanded);
        this.key = key;
    }

    updateLabel() {
        this.label = this.originalLabel + " (" + this.leafsCount + ")";
    }

    clearChilds(): void {
        super.clearChilds()
        this.leafsCount = 0;
    }

    addLeaf(leaf: WakeDetection, level? : number) {
        let segments = leaf.diagnostic.data.sourceUnitName.split("/");
        if (segments.length > 1) {
            let childNode = this.childsMap.get(segments[0]);
            if (childNode == undefined) {
                childNode = new PathItem(segments[0]);
                this.addChild(childNode);
            }
            childNode.addLeaf(leaf, 1)
            super.addLeaf(leaf, level)
        }
    }
}

class ImpactItem extends RootItem {

    constructor(impact: string) {
        super(impact, impact[0].toUpperCase() + impact.slice(1));

        if(impact == "warning") {
            this.iconPath = new vscode.ThemeIcon('warning', new vscode.ThemeColor("notificationsWarningIcon.foreground"));
        } else if (impact == "info") {
            this.iconPath = new vscode.ThemeIcon('info', new vscode.ThemeColor("notificationsInfoIcon.foreground"))
        } else {
            this.setIcon("impact_" + impact);
        }
    }
}

class ConfidenceItem extends RootItem {

    constructor(confidence: string) {
        super(confidence, confidence[0].toUpperCase() + confidence.slice(1));
        this.setIcon("confidence_" + confidence);
    }
}

class SeverityItem extends RootItem{

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
        super(severity, label);
        this.iconPath = icon;
    }

    addLeaf(leaf: WakeDetection) {
        let segments = leaf.diagnostic.data.sourceUnitName.split("/");
        if (segments.length > 1) {
            let childNode: PathItem | undefined = this.childsMap.get(segments[0]);
            if (childNode == undefined) {
                childNode = new PathItem(segments[0]);
                this.addChild(childNode);
            }
            childNode.addLeaf(leaf, 1)
        }
        super.addLeaf(leaf);
    }
}

class PathItem extends RootItem {
    constructor(segment: string) {
        super(segment, segment);
        this.setIcon("folder");
    }

    addChild(item: PathItem | FileItem): void {
        super.addChild(item)
    }

    addLeaf(leaf: WakeDetection, level: integer){
        let segments = leaf.diagnostic.data.sourceUnitName.split("/");
        let fileNode: FileItem | undefined;

        if (segments.length - level > 1) {
            let segment = segments[level];

            let pathNode = this.childsMap.get(segment) as PathItem;
            if (pathNode == undefined) {
                pathNode = new PathItem(segment);
                this.addChild(pathNode);
            }
            pathNode.addLeaf(leaf, level + 1)
        } else {
            fileNode = this.getChild(segments[segments.length - 1]) as FileItem
            if (fileNode == undefined) {
                fileNode = new FileItem(leaf.uri);
                this.addChild(fileNode)
            }
            fileNode.addChild(new DetectionItem(leaf));
        }
        this.leafsCount++;
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

    abstract refresh(): void;

    addRoot(node: RootItem){
        this.rootNodesMap.set(node.key, node);
        this.rootNodes.push(node);
    }

    add(uri: vscode.Uri, detections: WakeDetection[]){
        this.detectionsMap.set(uri.toString(), detections);
        this.refresh();
    }

    clear(){
        this.rootNodes = [];
        this.rootNodesMap.clear();
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
}

export enum GroupBy {
    IMPACT,
    PATH,
    CONFIDENCE,
    DETECTOR
}

export enum Impact {
    HIGH,
    MEDIUM,
    LOW,
    WARNING,
    INFO
}

export enum Confidence {
    HIGH,
    MEDIUM,
    LOW
}

export class WakeDetectionsProvider extends BaseProvider{

    groupBy: GroupBy = GroupBy.IMPACT;
    filterImpact: Impact = Impact.INFO;
    filterConfidence: Confidence = Confidence.LOW;

    constructor() {
        super()
    }

    getRoot(diagnostic: WakeDiagnostic): string {
        return diagnostic.data.impact;
    }

    refresh(): void {
        this.clear();

        switch (this.groupBy) {
            case GroupBy.IMPACT:
                this.buildTreeByImpact();
                break;
            case GroupBy.PATH:
                this.buildTreeByPath();
                break;
            case GroupBy.CONFIDENCE:
                this.buildTreeByConfidence();
                break;
            default:
                break;
        }
        
        this.rootNodes = this.rootNodes.filter(it => it.leafsCount > 0)

        this.rootNodes.forEach(it => {
            it.sortChilds();
        })

        this.updateRootLabels();
        this._onDidChangeTreeData.fire(undefined);
    }

    buildTreeByImpact(){
        this.addRoot(new ImpactItem("high"));
        this.addRoot(new ImpactItem("medium"));
        this.addRoot(new ImpactItem("low"));
        this.addRoot(new ImpactItem("warning"));
        this.addRoot(new ImpactItem("info"));

        for (const [key, value] of this.detectionsMap) {
            value.filter(it => this.filterDetections(it)).forEach(detection => {
                let rootNode = this.rootNodesMap.get(detection.diagnostic.data.impact);

                if (rootNode != undefined) {
                    rootNode.addLeaf(detection);
                }
            })
        }
    }

    buildTreeByPath() {
        for (const [key, value] of this.detectionsMap) {
            value.filter(it => this.filterDetections(it)).forEach(detection => {
                let segments = detection.diagnostic.data.sourceUnitName.split("/");
                let rootNode = this.rootNodesMap.get(segments[0]);

                if(rootNode == undefined){
                    rootNode = new PathItem(segments[0])
                    this.addRoot(rootNode)
                }
                
                rootNode.addLeaf(detection, 1);
            })
        }
    }

    buildTreeByConfidence() {
        this.addRoot(new ConfidenceItem("high"));
        this.addRoot(new ConfidenceItem("medium"));
        this.addRoot(new ConfidenceItem("low"));

        for (const [key, value] of this.detectionsMap) {
            value.filter(it => this.filterDetections(it)).forEach(detection => {
                let rootNode = this.rootNodesMap.get(detection.diagnostic.data.confidence);

                if (rootNode != undefined) {
                    rootNode.addLeaf(detection);
                }
            })
        }
    }

    filterDetections(detection : WakeDetection): boolean{
        var filterImpact = true
        var filterConfidence = true

        switch (this.filterImpact) {
            case Impact.HIGH:
                if (detection.diagnostic.data.impact == "medium") {
                    filterImpact = false;
                }
            case Impact.MEDIUM:
                if (detection.diagnostic.data.impact == "low") {
                    filterImpact = false;
                }
            case Impact.LOW:
                if (detection.diagnostic.data.impact == "warning") {
                    filterImpact = false;
                }
            case Impact.WARNING:
                if (detection.diagnostic.data.impact == "info") {
                    filterImpact = false;
                }
                break;
            default:
                break;
        }
        switch (this.filterConfidence) {
            case Confidence.HIGH:
                if (detection.diagnostic.data.confidence == "medium") {
                    filterConfidence = false;
                }
            case Confidence.MEDIUM:
                if (detection.diagnostic.data.confidence == "low") {
                    filterConfidence = false;
                }
                break;
            default:
                break;
        }
        return filterImpact && filterConfidence;
    }

    setGroupBy(groupBy : GroupBy){
        this.groupBy = groupBy;
        this.refresh();
    }

    setFilterImpact(minImpact : Impact){
        this.filterImpact = minImpact;
        this.refresh();
    }

    setFilterConfidence(minConfidence: Confidence) {
        this.filterConfidence = minConfidence;
        this.refresh();
    }
}

export class SolcDetectionsProvider extends BaseProvider{

    refresh(): void {
        this.clear();

        this.addRoot(new SeverityItem("error"));
        this.addRoot(new SeverityItem("warning"));
        this.addRoot(new SeverityItem("info"));

        for (const [key, value] of this.detectionsMap) {
            value.forEach(detection => {
                let rootNode = this.rootNodesMap.get(detection.diagnostic.data.severity);

                if (rootNode != undefined) {
                    rootNode.addLeaf(detection);
                }
            })
        }

        this.rootNodes.forEach(it => {
            it.sortChilds();
        })

        this.updateRootLabels();
        this._onDidChangeTreeData.fire(undefined);
    }
}