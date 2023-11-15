import * as vscode from 'vscode';
import { WakeDetection } from './WakeDetection';
import { BaseItem } from './BaseItem';
import { FileItem } from './FileItem';


export class PathItem extends BaseItem<PathItem | FileItem> {

    path: string;

    constructor(segment: string, path: string, context: vscode.ExtensionContext) {
        super(segment, segment, vscode.TreeItemCollapsibleState.Expanded, context);
        this.setIcon("folder");
        this.path = path;
        this.tooltip = path;
    }

    addChild(item: PathItem | FileItem): void {
        super.addChild(item);
    }

    addLeaf(leaf: WakeDetection, level: number) {
        let segments = leaf.diagnostic.data.sourceUnitName.split("/");
        let fileNode: FileItem | undefined;

        if (segments.length - level > 1) {
            let segment = segments[level];

            let pathNode = this.childsMap.get(segment) as PathItem;
            if (pathNode == undefined) {
                pathNode = new PathItem(segment, segments.slice(0, level+1).join("/"), this.context);
                this.addChild(pathNode);
            }
            pathNode.addLeaf(leaf, level + 1);
        } else {
            fileNode = this.getChild(segments[segments.length - 1]) as FileItem;
            if (fileNode == undefined) {
                fileNode = new FileItem(leaf.uri, leaf.diagnostic.data.sourceUnitName, this.context);
                this.addChild(fileNode);
            }
            fileNode.addLeaf(leaf);
        }
        this.leafsCount++;
    }

    sortChilds(): void {
        this.childs.sort((a: PathItem | FileItem, b: PathItem | FileItem) => {
            if (a instanceof PathItem && b instanceof FileItem) {
                return -1;
            } else if (a instanceof FileItem && b instanceof PathItem) {
                return 1;
            } else {
                return a.originalLabel.localeCompare(b.originalLabel);
            }
        });
        super.sortChilds();
    }
}
