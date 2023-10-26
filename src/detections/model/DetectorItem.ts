import * as vscode from "vscode";
import { BaseRootItem } from './BaseRootItem';

export class DetectorItem extends BaseRootItem {

    constructor(detector: string, context: vscode.ExtensionContext) {
        super(detector, detector, context);
    }
}
