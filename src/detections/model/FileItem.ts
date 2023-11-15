import * as vscode from 'vscode';
import { BaseItem } from './BaseItem';
import { DetectionItem } from './DetectionItem';
import { WakeDetection } from './WakeDetection';


export class FileItem extends BaseItem<DetectionItem> {
    uri: vscode.Uri;

    constructor(uri: vscode.Uri, sourceUnitName: string, context: vscode.ExtensionContext) {
        let filename = uri.path.substring(uri.path.lastIndexOf("/") + 1)
        super(filename, filename, vscode.TreeItemCollapsibleState.Expanded, context);
        this.uri = uri;
        this.setIcon("solidity");
        this.tooltip = sourceUnitName;
    }

    addChild(item: DetectionItem) {
        super.addChild(item);
    }

    addLeaf(leaf: WakeDetection, level?: number) {
        this.addChild(new DetectionItem(leaf, this.context));
        super.addLeaf(leaf);
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
