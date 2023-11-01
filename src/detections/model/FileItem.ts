import * as vscode from 'vscode';
import { BaseItem } from './BaseItem';
import { DetectionItem } from './DetectionItem';
import { BaseRootItem } from './BaseRootItem';
import { WakeDetection } from './WakeDetection';


export class FileItem extends BaseRootItem {
    uri: vscode.Uri;

    constructor(uri: vscode.Uri, context: vscode.ExtensionContext) {
        let filename = uri.path.substring(uri.path.lastIndexOf("/") + 1)
        super(filename, filename, context);
        this.uri = uri;
        this.setIcon("solidity");
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
