import * as vscode from 'vscode';
import {Diagnostic} from './extension';
import { DiagnosticSeverity, integer } from 'vscode-languageclient';

export interface WakeDiagnostic extends vscode.Diagnostic {
    
}

class SeverityItem extends vscode.TreeItem {
    constructor(severity : integer, collapsibleState?: vscode.TreeItemCollapsibleState) {
        let label : string
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
                label = ""
                break;
        }
        super(label, collapsibleState)
    }
}

class ImpactItem extends vscode.TreeItem {
    constructor(imapct: integer, collapsibleState?: vscode.TreeItemCollapsibleState) {
        let label: string
        switch (imapct) {
            case 1:
                label = "High"
                break;
            case 2:
                label = "Medium"
                break;
            case 3:
                label = "Low"
                break;
            case 4:
                label = "Warning"
                break;
            case 5:
                label = "Info"
                break;
            default:
                label = ""
                break;
        }
        super(label, collapsibleState)
    }
}

export class DetectionItem extends vscode.TreeItem {

    constructor(label: string, collapsibleState?: vscode.TreeItemCollapsibleState){
        super(label, collapsibleState)
    }
}

export class BaseDetectionsProvider implements vscode.TreeDataProvider<DetectionItem>{

    outputChannel: vscode.OutputChannel | undefined;
    detectionsMap: Map<vscode.Uri, WakeDiagnostic> = new Map<vscode.Uri, WakeDiagnostic>()
    nodes: vscode.TreeItem[] = new Array();

    constructor(outputChannel: vscode.OutputChannel){
        this.outputChannel = outputChannel;
    }

    onDidChangeTreeData?: vscode.Event<void | vscode.TreeItem | vscode.TreeItem[] | null | undefined> | undefined;

    add(notification : Diagnostic){
        
    }

    refresh(){

    }

    getTreeItem(element: vscode.TreeItem): vscode.TreeItem | Thenable<vscode.TreeItem> {
        this.outputChannel?.appendLine("getTreeItem: " + element.label)
        return element;
    }

    getChildren(element?: vscode.TreeItem | undefined): vscode.ProviderResult<vscode.TreeItem[]> {
        this.outputChannel?.appendLine("getChildren: " + element?.label)
        if (element == undefined){
            return this.nodes;
        } else {
            
        }
    }
    
}

export class WakeDetectionsProvider extends BaseDetectionsProvider {
    constructor(outputChannel: vscode.OutputChannel) {
        super(outputChannel);
        this.nodes.push(new ImpactItem(1));
        this.nodes.push(new ImpactItem(2));
        this.nodes.push(new ImpactItem(3));
        this.nodes.push(new ImpactItem(4));
        this.nodes.push(new ImpactItem(5));
    }
}

export class SolcDetectionsProvider extends BaseDetectionsProvider {
    constructor(outputChannel: vscode.OutputChannel) {
        super(outputChannel);
        this.nodes.push(new SeverityItem(1));
        this.nodes.push(new SeverityItem(2));
        this.nodes.push(new SeverityItem(3));
        this.nodes.push(new SeverityItem(4));
    }
}