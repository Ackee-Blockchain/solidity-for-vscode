import * as polka from 'polka';
import sirv from 'sirv';
import * as vscode from 'vscode';
import { WalletDeploymentData } from './sake/webview/shared/types';
const getPort = require('get-port');

export class WalletServer {
    private _app: polka.Polka;
    private _staticFiles: polka.Middleware;
    private _port: number | undefined;
    private _deploymentData: WalletDeploymentData | undefined;

    constructor(private _context: vscode.ExtensionContext) {
        this._app = polka();
        const root = vscode.Uri.joinPath(_context.extensionUri, 'dist', 'wallet');
        this._staticFiles = sirv(root.fsPath, { single: true });
    }

    public async start() {
        if (this._port) {
            console.log(`Wallet Server already running on http://localhost:${this._port}`);
            return this._port;
        }

        this._deploymentData = undefined;

        this._port = await getPort({ port: 3000 });

        // Serve static files only on the root path
        this._app.use((req, res, next) => {
            if (!req.path.startsWith('/api')) {
                this._staticFiles(req, res, next);
            } else {
                next();
            }
        });

        // Serve deployment data on /api/deployment
        this._app.get('/api/deployment', (req, res) => {
            console.log('fetching deployment data');
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify(this._deploymentData));
        });

        return new Promise((resolve, reject) => {
            this._app.listen(this._port, (err: Error) => {
                if (err) {
                    console.error(err);
                    reject(err);
                    return;
                }
                console.log(`Wallet Server running on http://localhost:${this._port}`);
                resolve(this._port);
            });

            this._context.subscriptions.push({
                dispose: () => {
                    console.log(`Stopping Wallet Server`);
                    this._port = undefined;
                    this._deploymentData = undefined;
                    this._app.server!.close();
                }
            });
        });
    }

    public get port() {
        return this._port;
    }

    public setDeploymentData(deploymentData: WalletDeploymentData) {
        this._deploymentData = deploymentData;
    }

    public async openInBrowser() {
        await vscode.env.openExternal(vscode.Uri.parse(`http://localhost:${this._port}`));
    }
}
