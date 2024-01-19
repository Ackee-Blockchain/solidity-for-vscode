import { WakeDiagnostic, WakeDetection, Code } from './model/WakeDetection';
import { ImpactItem } from './model/ImpactItem';
import { DetectorItem } from './model/DetectorItem';
import { ConfidenceItem } from './model/ConfidenceItem';
import { PathItem } from './model/PathItem';
import { BaseTreeProvider } from './BaseTreeProvider';
import { FileItem } from './model/FileItem';
import * as vscode from 'vscode';

export class WakeTreeDataProvider extends BaseTreeProvider {

    groupBy: GroupBy = GroupBy.IMPACT;
    filterImpact: Impact = Impact.INFO;
    filterConfidence: Confidence = Confidence.LOW;

    constructor(context : vscode.ExtensionContext){
        super(context);
        this.loadConfig();
    }

    private loadConfig(){
        let groupByConfig = this.context.workspaceState.get("detections.groupBy")
        let filterImpactConfig = this.context.workspaceState.get("detections.filterImpact")
        let filterConfidenceConfig = this.context.workspaceState.get("detections.filterConfidence")

        if (groupByConfig !== undefined) this.groupBy = GroupBy[groupByConfig as keyof typeof GroupBy];
        if (filterImpactConfig !== undefined) this.filterImpact = Impact[filterImpactConfig as keyof typeof Impact];
        if (filterConfidenceConfig !== undefined) this.filterConfidence = Confidence[filterConfidenceConfig as keyof typeof Confidence];

        vscode.commands.executeCommand('setContext', 'detections.group', GroupBy[this.groupBy]);
        vscode.commands.executeCommand('setContext', 'detections.filterImpact', Impact[this.filterImpact]);
        vscode.commands.executeCommand('setContext', 'detections.filterConfidence', Confidence[this.filterConfidence]);
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
            case GroupBy.FILE:
                this.buildTreeByPath();
                break;
            case GroupBy.CONFIDENCE:
                this.buildTreeByConfidence();
                break;
            case GroupBy.DETECTOR:
                this.buildTreeByDetector();
                break;
            default:
                break;
        }

        this.rootNodes = this.rootNodes.filter(it => it.leafsCount > 0);

        this.sort();

        this.updateLabels();
        this._onDidChangeTreeData.fire(undefined);
    }

    buildTreeByImpact() {
        this.addRoot(new ImpactItem("high", this.context));
        this.addRoot(new ImpactItem("medium", this.context));
        this.addRoot(new ImpactItem("low", this.context));
        this.addRoot(new ImpactItem("warning", this.context));
        this.addRoot(new ImpactItem("info", this.context));

        for (const [key, value] of this.detectionsMap) {
            value.filter(it => this.filterDetections(it)).forEach(detection => {
                let rootNode = this.rootNodesMap.get(detection.diagnostic.data.impact);

                if (rootNode != undefined) {
                    rootNode.addLeaf(detection);
                }
            });
        }
    }

    buildTreeByPath() {
        for (const [key, value] of this.detectionsMap) {
            value.filter(it => this.filterDetections(it)).forEach(detection => {
                let segments = detection.diagnostic.data.sourceUnitName.split("/");
                let rootNode = this.rootNodesMap.get(segments[0]);
                if (rootNode == undefined) {
                    if(segments.length > 1){
                        rootNode = new PathItem(segments[0], segments[0], this.context);
                        this.addRoot(rootNode);
                    } else {
                        rootNode = new FileItem(detection.uri, detection.diagnostic.data.sourceUnitName, this.context);
                        this.addRoot(rootNode);
                    }
                }
                rootNode.addLeaf(detection, 1);
            });
        }

        this.rootNodes.sort((a, b) => {
            if (a instanceof PathItem && b instanceof FileItem) {
                return -1;
            } else if (a instanceof FileItem && b instanceof PathItem) {
                return 1;
            } else {
                return a.originalLabel.localeCompare(b.originalLabel);
            }
        });
    }

    buildTreeByConfidence() {
        this.addRoot(new ConfidenceItem("high", this.context));
        this.addRoot(new ConfidenceItem("medium", this.context));
        this.addRoot(new ConfidenceItem("low", this.context));

        for (const [key, value] of this.detectionsMap) {
            value.filter(it => this.filterDetections(it)).forEach(detection => {
                let rootNode = this.rootNodesMap.get(detection.diagnostic.data.confidence);

                if (rootNode != undefined) {
                    rootNode.addLeaf(detection);
                }
            });
        }
    }

    buildTreeByDetector() {
        for (const [key, value] of this.detectionsMap) {
            value.filter(it => this.filterDetections(it)).forEach(detection => {
                let rootNode = this.rootNodesMap.get(detection.detector.id);

                if (rootNode == undefined) {
                    rootNode = new DetectorItem(detection.detector, this.context);
                    this.addRoot(rootNode);
                }

                rootNode.addLeaf(detection, 0);
            });
        }

        this.rootNodes.sort((a, b) => {
            return (a as DetectorItem).detector.id.localeCompare((b as DetectorItem).detector.id);
        });
    }

    filterDetections(detection: WakeDetection): boolean {
        var filterImpact = true;
        var filterConfidence = true;

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

    setGroupBy(groupBy: GroupBy) {
        this.groupBy = groupBy;
        this.context.workspaceState.update("detections.groupBy", GroupBy[groupBy]).then(() => this.refresh());
        vscode.commands.executeCommand('setContext', 'detections.group', GroupBy[groupBy]);
    }

    setFilterImpact(minImpact: Impact) {
        this.filterImpact = minImpact;
        this.context.workspaceState.update("detections.filterImpact", Impact[minImpact]).then(() => this.refresh());
        vscode.commands.executeCommand('setContext', 'detections.filterImpact', Impact[minImpact]);
    }

    setFilterConfidence(minConfidence: Confidence) {
        this.filterConfidence = minConfidence;
        this.context.workspaceState.update("detections.filterConfidence", Confidence[minConfidence]).then(() => this.refresh());
        vscode.commands.executeCommand('setContext', 'detections.filterConfidence', Confidence[minConfidence]);
    }
}

export enum GroupBy {
    IMPACT,
    FILE,
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

