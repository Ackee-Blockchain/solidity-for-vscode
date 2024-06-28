import { Uri, ExtensionContext } from "vscode";
import { SvgExporter } from "./SvgExporter";
import { getPreviewTemplate } from "./ContentUtils";
import open from 'open';
import * as tmp from 'tmp';
import * as path from 'path';
import fs = require('fs');
import { Graphviz } from "@hpcc-js/wasm/types/graphviz";

export class OpenInBrowser extends SvgExporter {
    constructor(private context: ExtensionContext, graphviz: Graphviz) {
        super(graphviz);
    }

    async open(dotSource: string): Promise<void> {

        var svgString = await this.renderSvgString(dotSource);

        var browseTemplate = await getPreviewTemplate(this.context, "browseTemplate.html");

        var htmlString = browseTemplate
            .replace("PLACEHOLDER", svgString)
            .replace("TITLE", "Graph");

        var htmlFilePath = OpenInBrowser.toTempFile("graph", ".html", htmlString);

        // open the file in the default browser
        await open("file://" + htmlFilePath);
    }

    static toTempFile(prefix: string, suffix: string, text: string): string {
        var tempFile = tmp.fileSync({ mode: 0o644, prefix: prefix + '-', postfix: suffix });
        fs.writeSync(tempFile.fd, text, 0, 'utf8');
        return tempFile.name;
    }
}