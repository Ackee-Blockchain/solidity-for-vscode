import * as vscode from "vscode";
import { BaseRootItem } from './BaseRootItem';
import { WakeDetection } from './WakeDetection';
import { PathItem } from './PathItem';

export class ConfidenceItem extends BaseRootItem {

    constructor(confidence: string, context: vscode.ExtensionContext) {
        super(confidence, confidence[0].toUpperCase() + confidence.slice(1), context);
        this.setIcon("confidence_" + confidence);
    }

    addLeaf(leaf: WakeDetection, level?: number) {
        let segments = leaf.diagnostic.data.sourceUnitName.split("/");
        if (segments.length > 1) {
            let childNode = this.childsMap.get(segments[0]);
            if (childNode == undefined) {
                childNode = new PathItem(segments[0], this.context);
                this.addChild(childNode);
            }
            childNode.addLeaf(leaf, 1)
            super.addLeaf(leaf, level)
        }
    }
    
}
