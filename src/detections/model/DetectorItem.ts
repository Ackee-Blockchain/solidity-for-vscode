import * as vscode from "vscode";
import { BaseItem } from './BaseItem';
import { WakeDetection, Detector } from "./WakeDetection";
import { PathItem } from "./PathItem";
import { FileItem } from "./FileItem";
import { DetectionItem } from "./DetectionItem";

export class DetectorItem extends BaseItem<BaseItem<any>> {

    detector : Detector

    constructor(detector: Detector, context: vscode.ExtensionContext) {
        super(detector.id, detector.id, vscode.TreeItemCollapsibleState.Expanded, context);
        this.detector = detector;
        this.contextValue = 'DETECTOR';
    }

    addLeaf(leaf: WakeDetection, level?: number) {
        let segments = leaf.diagnostic.data.sourceUnitName.split("/");
        let childNode = this.childsMap.get(segments[0]);
        if (segments.length > 1) {
            if (childNode == undefined) {
                childNode = new PathItem(segments[0], segments[0], this.context);
                this.addChild(childNode);
            }
            childNode.addLeaf(leaf, 1)
        } else {
            if (childNode == undefined) {
                childNode = new FileItem(leaf.uri, leaf.diagnostic.data.sourceUnitName, this.context);
                this.addChild(childNode);
            }
            childNode.addChild(new DetectionItem(leaf, this.context));
        }
        super.addLeaf(leaf, level);
    }
}

