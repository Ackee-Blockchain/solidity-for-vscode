import * as vscode from 'vscode';
import { BaseItem } from './BaseItem';
import { WakeDetection } from './WakeDetection';
import { DetectionRelatedInfoItem } from './DetectionRelatedInfoItem';


export class DetectionItem extends BaseItem<DetectionRelatedInfoItem> {

    detection: WakeDetection;

    constructor(detection: WakeDetection, context: vscode.ExtensionContext) {
        let id = "L" + (detection.diagnostic.range.start.line + 1) + ": " + detection.diagnostic.message;
        super(id, id, detection.diagnostic.relatedInformation != undefined ? vscode.TreeItemCollapsibleState.Collapsed : vscode.TreeItemCollapsibleState.None, context);
        this.detection = detection;
        this.command = {
            title: "Open",
            command: "Tools-for-Solidity.detections.open_file",
            arguments: [detection.uri, detection.diagnostic.range]
        };

        if (detection.diagnostic.data.impact != undefined) {
            this.setIcon("detection_" + detection.diagnostic.data.impact + "_" + detection.diagnostic.data.confidence);
        } else {
            this.setIconBySeverity();
        }
        if (detection.diagnostic.relatedInformation != undefined){
            detection.diagnostic.relatedInformation.forEach(it => {
                this.addChild(new DetectionRelatedInfoItem(it, context));
            })
        }
    }

    setIconBySeverity() {
        switch (this.detection.diagnostic.severity) {
            case 0:
                this.iconPath = new vscode.ThemeIcon('error', new vscode.ThemeColor("notificationsErrorIcon.foreground"));
                break;
            case 1:
                this.iconPath = new vscode.ThemeIcon('warning', new vscode.ThemeColor("notificationsWarningIcon.foreground"));
                break;
            case 2:
                this.iconPath = new vscode.ThemeIcon('info', new vscode.ThemeColor("notificationsInfoIcon.foreground"));
                break;
            default:
        }
    }
}
