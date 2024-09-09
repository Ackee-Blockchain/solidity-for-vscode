import * as polka from 'polka';
import sirv from 'sirv';
import * as vscode from 'vscode';
import { json } from 'body-parser';

class WalletServer {
    private app: ReturnType<typeof polka>;
    private root: vscode.Uri;
    private deployment: Record<string, any> = {
        version: '1.0.0',
        environment: 'development'
    };

    constructor(private context: vscode.ExtensionContext) {
        this.root = vscode.Uri.joinPath(this.context.extensionUri, 'webview', 'wallet');
        this.app = polka();
    }

    public start(port: number = 3000) {
        const staticFiles = sirv(this.root.fsPath, { single: true });

        this.app
            .use(json())
            .use(staticFiles)
            .get('/api/deployment', (req: any, res: any) => {
                res.end(JSON.stringify(this.deployment));
            })
            .listen(port, (err: Error) => {
                if (err) {
                    console.error(err);
                    return;
                }
                console.log(`Server running on http://localhost:${port}`);
            });

        this.context.subscriptions.push({
            dispose: () => this.app.server!.close()
        });
    }
}
