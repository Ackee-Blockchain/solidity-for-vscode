import * as vscode from 'vscode';
import { BaseItem } from './BaseItem';
import { DetectionItem } from './DetectionItem';


export class FileItem extends BaseItem<DetectionItem> {
    uri: vscode.Uri;

    constructor(uri: vscode.Uri, context: vscode.ExtensionContext) {
        super(uri.path.substring(uri.path.lastIndexOf("/") + 1), vscode.TreeItemCollapsibleState.Expanded, context);
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
