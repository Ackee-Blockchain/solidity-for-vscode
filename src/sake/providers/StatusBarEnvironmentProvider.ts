import * as vscode from 'vscode';

export class StatusBarEnvironmentProvider {
    _statusBarEnvironment?: vscode.StatusBarItem;
    _envs?: string[];
    _currentEnv?: string;

    constructor() {
        this._statusBarEnvironment = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 1);
        this._statusBarEnvironment.command = this.getCommandId();

        this._envs = [
            "Shanghai", 
            "Merge", 
            "London",
            "Berlin"
        ];
        this._currentEnv = this._envs[0];

        this._setStatusBarText();
    }

    private _setStatusBarText() {
        this._statusBarEnvironment!.text = `$(cloud) Environment: ${this._currentEnv}`;
        this._statusBarEnvironment!.show();
    }

    public getCommandId() {
        return "sake.setEnvironment";
    }

    public getCommand() {
        return () => {
            vscode.window.showQuickPick(this._envs!).then((env) => {
                if (env) {
                    this._currentEnv = env;
                    this._setStatusBarText();
                }
            });
        };
    }

    public registerCommand() {
        return vscode.commands.registerCommand(this.getCommandId(), this.getCommand())
    }

    public getStatusBarItem() {
        return this._statusBarEnvironment!;
    }
}