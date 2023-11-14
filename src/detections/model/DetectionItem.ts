import * as vscode from 'vscode';
import { BaseItem } from './BaseItem';
import { WakeDetection } from './WakeDetection';


export class DetectionItem extends BaseItem<any> {

    detection: WakeDetection;

    constructor(detection: WakeDetection, context: vscode.ExtensionContext) {
        super("L" + (detection.diagnostic.range.start.line + 1) + ": " + detection.diagnostic.message, undefined, context);
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
        this.tooltip = detection.diagnostic.data.sourceUnitName;
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
