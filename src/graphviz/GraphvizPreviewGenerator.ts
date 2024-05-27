import { ExtensionContext, window, ViewColumn, Uri, WebviewPanel, Disposable } from "vscode";
import * as path from "path";
import { SvgExporter } from "./SvgExporter";
import { OpenInBrowser } from "./OpenInBrowser";
import { getPreviewTemplate, CONTENT_FOLDER } from "./ContentUtils";
import { Graphviz } from "@hpcc-js/wasm/types/graphviz";

export class GraphvizPreviewGenerator extends Disposable {

    webviewPanels = new Array<PreviewPanel>();

    constructor(private context: ExtensionContext, private graphviz: Graphviz) {
        super(() => this.dispose());
     }

    rebuild(): void {
        this.webviewPanels.forEach(panel => {
            if (panel.getNeedsRebuild() && panel.getPanel().visible) {
                this.updateContent(panel);
            }
        });
    }

    async handleMessage(previewPanel: PreviewPanel, message: any): Promise<void> {
        switch(message.command){
            case 'scale':
                previewPanel.setScale(message.value);
                break;
            case 'layout':
                previewPanel.setLayout(message.value);
                await this.updateContent(previewPanel);
                break;
            case 'fitToHeight':
                previewPanel.setFitToHeight(message.value);
                break;
            case 'fitToWidth':
                previewPanel.setFitToWidth(message.value);
                break;
            case 'export':
                new SvgExporter(this.graphviz).export(previewPanel.dotSource);
                break;
            case 'open':
                new OpenInBrowser(this.context, this.graphviz).open(previewPanel.dotSource);
                break;
            default:
                console.warn('Unexpected command: ' + message.command);
        }
    }

    createPreviewPanel(dotSource: string, title: string, displayColumn: ViewColumn): PreviewPanel {
        const webViewPanel = window.createWebviewPanel('graphvizPreview', title, displayColumn, {
            enableFindWidget: true,
            enableScripts: true,
            localResourceRoots: [Uri.file(path.join(this.context.extensionPath, "resources/webviews/graphviz"))]
        });
        webViewPanel.onDidDispose(() => {
            this.webviewPanels = this.webviewPanels.filter(panel => panel.getPanel() !== webViewPanel);
        }, undefined, this.context.subscriptions);
        // when the pane becomes visible again, refresh it
        webViewPanel.onDidChangeViewState(_ => this.rebuild());

        const panel = new PreviewPanel(dotSource, webViewPanel);
        this.webviewPanels.push(panel);

        webViewPanel.webview.onDidReceiveMessage(async e => await this.handleMessage(panel, e), undefined, this.context.subscriptions);

        return panel;
    }

    async updateContent(previewPanel: PreviewPanel) {
        if(!previewPanel.getPanel().webview.html) {
            previewPanel.getPanel().webview.html = "Please wait...";
        }
        previewPanel.setNeedsRebuild(false);
        previewPanel.getPanel().webview.html = await this.getPreviewHtml(previewPanel);
    }

    toSvg(layout: string, dotSource: string): Thenable<string> | string {
		type Engine = "circo" | "dot" | "fdp" | "neato" | "osage" | "patchwork" | "twopi"
		return this.graphviz.layout(dotSource, "svg", layout as Engine);
    }

    private async getPreviewHtml(previewPanel: PreviewPanel): Promise<string> {
        let templateHtml = await getPreviewTemplate(this.context, "previewTemplate.html");

        // change resource URLs to vscode-resource:
        templateHtml = templateHtml.replace(/<script src="(.+)"/g, (scriptTag, srcPath) => {
            let resource = previewPanel.getPanel().webview.asWebviewUri(
                Uri.joinPath(this.context.extensionUri, CONTENT_FOLDER, srcPath));
            return `<script src="${resource}"`;
        }).replace("initializeScale(1,false,false,\'dot\')",
            `initializeScale(${previewPanel.getScale()}, ${previewPanel.getFitToWidth()}, ${previewPanel.getFitToHeight()}, \'${previewPanel.getLayout()}\')`);

        let svg = "";
        try {
			let layout = previewPanel.getLayout();
            svg = await this.toSvg(layout, previewPanel.dotSource);
        }catch(error){
            if (error instanceof Error) {
                svg = error.toString();
            } else {
                svg = "An unknown error occurred.";
            }
        }

        return templateHtml.replace("PLACEHOLDER", svg);
    }
}

class PreviewPanel {

    needsRebuild = false;
    scale = 1;
    fitToWidth = false;
    fitToHeight = false;
	layout = "dot";

    constructor(public dotSource: string, private panel: WebviewPanel) {}

    setScale(value: number): void {
        this.scale = value;
    }

	setLayout(value: string): void {
		this.layout = value;
	}

	getScale(): number {
        return this.scale;
    }

	getLayout(): string {
        return this.layout;
    }

    setFitToWidth(value: boolean): void {
        this.fitToWidth = value;
    }

    getFitToWidth(): boolean {
        return this.fitToWidth;
    }

    setFitToHeight(value: boolean): void {
        this.fitToHeight = value;
    }

    getFitToHeight(): boolean {
        return this.fitToHeight;
    }

    reveal(displayColumn: ViewColumn): void {
        this.panel.reveal(displayColumn);
    }

    setNeedsRebuild(needsRebuild: boolean) {
        this.needsRebuild = needsRebuild;
    }

    getNeedsRebuild(): boolean {
        return this.needsRebuild;
    }

    getPanel(): WebviewPanel {
        return this.panel;
    }
}