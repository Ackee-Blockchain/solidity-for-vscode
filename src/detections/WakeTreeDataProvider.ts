import { WakeDetection } from './model/WakeDetection';
import { WakeDiagnostic } from './model/WakeDetection';
import { ImpactItem } from './model/ImpactItem';
import { DetectorItem } from './model/DetectorItem';
import { ConfidenceItem } from './model/ConfidenceItem';
import { PathItem } from './model/PathItem';
import { BaseTreeProvider } from './BaseTreeProvider';

export class WakeTreeDataProvider extends BaseTreeProvider {

    groupBy: GroupBy = GroupBy.IMPACT;
    filterImpact: Impact = Impact.INFO;
    filterConfidence: Confidence = Confidence.LOW;

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
                    rootNode = new PathItem(segments[0], this.context);
                    this.addRoot(rootNode);
                }

                rootNode.addLeaf(detection, 1);
            });
        }
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
                let detector = detection.diagnostic.code;
                let segments = detection.diagnostic.data.sourceUnitName.split("/");

                if (detection.diagnostic.code == undefined) {
                    detector = "unknown";
                } else {
                    detector = detection.diagnostic.code as string;
                }

                let rootNode = this.rootNodesMap.get(detector);

                if (rootNode == undefined) {
                    rootNode = new DetectorItem(detector, this.context);
                    this.addRoot(rootNode);
                }

                rootNode.addLeaf(detection, 0);
            });
        }
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
        this.refresh();
    }

    setFilterImpact(minImpact: Impact) {
        this.filterImpact = minImpact;
        this.refresh();
    }

    setFilterConfidence(minConfidence: Confidence) {
        this.filterConfidence = minConfidence;
        this.refresh();
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

