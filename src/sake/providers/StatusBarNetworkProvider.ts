import * as vscode from 'vscode';

export class StatusBarNetworkProvider {
    private _statusBarItem?: vscode.StatusBarItem;
    private _networks: string[] = ['Local Node', ''];
    private _currentEnv?: string;

    constructor(private _context: vscode.ExtensionContext) {
        this._statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 1);
        this._statusBarItem.command = this.getCommandId();

        this._envs = ['Shanghai', 'Merge', 'London', 'Berlin'];
        this._currentEnv = this._envs[0];

        this._setStatusBarText();
    }

    private _setStatusBarText() {
        this._statusBarItem!.text = `$(cloud) Network: ${this._currentEnv}`;
        this._statusBarItem!.show();
    }

    public getCommandId() {
        return 'sake.setNetwork';
    }

    public getCommand() {
        return () => {
            vscode.window.showQuickPick(this._envs!).then((env) => {
                if (env) {
                    this._currentEnv = env;
                    this._setStatusBarText();
                }
            });

            vscode.window.showInformationMessage('Set Network');
        };
    }

    public registerCommand() {
        return vscode.commands.registerCommand(this.getCommandId(), this.getCommand());
    }

    public getStatusBarItem() {
        return this._statusBarNetwork!;
    }
}
