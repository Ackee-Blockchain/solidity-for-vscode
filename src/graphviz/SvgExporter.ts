import { Graphviz } from '@hpcc-js/wasm/types/graphviz';
import fs = require('fs');
import { Uri, window, workspace } from 'vscode';

export class SvgExporter {
    constructor(private graphviz: Graphviz) {

    }

    async export(dotSource: string): Promise<void> {
        let defaultUri = workspace.workspaceFolders ? workspace.workspaceFolders[0].uri.with({path: "graph.svg"}) : undefined;

        let uri = await window.showSaveDialog({defaultUri: defaultUri, saveLabel: "Save as SVG...",
        filters: {
            "SVG": ["svg"]
        }});

        if (uri !== undefined) {
            let svg = await this.renderSvgString(dotSource);

            fs.writeFile(uri.fsPath, svg, 'utf8', err => {
                if (err) {
                    window.showErrorMessage("Cannot export to file " + uri?.fsPath);
                    console.log(err);
                }
            });
        }
    }

    protected async renderSvgString(dotSource: string): Promise<string> {
        let svg = this.graphviz.dot(dotSource);
        return svg;
    }
}