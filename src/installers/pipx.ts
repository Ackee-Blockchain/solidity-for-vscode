import * as vscode from 'vscode';
import { ExecaChildProcess, execaSync, execa } from "execa";
import { compare } from '@renovatebot/pep440';
import { Analytics, EventType } from '../Analytics';
import { Installer, WAKE_MIN_VERSION } from './installerInterface';

export class PipxInstaller implements Installer {
    constructor(
        private readonly context: vscode.ExtensionContext,
        private readonly outputChannel: vscode.OutputChannel,
        private readonly analytics: Analytics,
        private readonly prerelease: boolean,
    ) {
    }

    private async pipxInstall(): Promise<void> {
        let message;
        if (this.prerelease) {
            message = "Running 'pipx install --pip-args=--pre eth-wake'";
        } else {
            message = "Running 'pipx install eth-wake'";
        }
        this.outputChannel.appendLine(message);

        await vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: message,
            cancellable: false
        }, async () => {
            let out: string = "";
            if (this.prerelease) {
                out = execaSync("pipx", ["install", "--pip-args=--pre", "eth-wake"]).stdout;
            } else {
                out = execaSync("pipx", ["install", "eth-wake"]).stdout;
            }
            if (out.trim().length > 0) {
                this.outputChannel.appendLine(out);
            }
        });
    }

    private async pipxUpgrade(): Promise<void> {
        let message;
        if (this.prerelease) {
            message = "Running 'pipx upgrade --pip-args=--pre eth-wake'";
        } else {
            message = "Running 'pipx upgrade eth-wake'";
        }
        this.outputChannel.appendLine(message);

        await vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: message,
            cancellable: false
        }, async () => {
            let out: string = "";
            if (this.prerelease) {
                this.outputChannel.appendLine(`Running 'pipx upgrade --pip-args=--pre eth-wake'`);
                out = execaSync("pipx", ["upgrade", "--pip-args=--pre", "eth-wake"]).stdout;
            } else {
                this.outputChannel.appendLine(`Running 'pipx upgrade eth-wake'`);
                out = execaSync("pipx", ["upgrade", "eth-wake"]).stdout;
            }
            if (out.trim().length > 0) {
                this.outputChannel.appendLine(out);
            }
        });
    }

    private getWakeVersion(): string {
        return execaSync("pipx", ["run", "--spec", "eth-wake", "wake", "--version"]).stdout.trim();
    }

    private getCertifiPath(): string | undefined {
        try {
            return execaSync("pipx", ["run", "--spec", "eth-wake", "python", "-m", "certifi"]).stdout.trim();
        } catch(err) {
            this.analytics.logCrash(EventType.ERROR_CERTIFI_PATH, err);
            return undefined;
        }
    }

    startWake(port: number): ExecaChildProcess {
        const env = { ...process.env, PYTHONIOENCODING: 'utf8' } as { [key: string]: string };

        let certifiPath = undefined;
        if (process.platform === 'darwin') {
            certifiPath = this.getCertifiPath();
        }

        if (certifiPath) {
            env.SSL_CERT_FILE = certifiPath;
            env.REQUESTS_CA_BUNDLE = certifiPath;
        }

        this.outputChannel.appendLine(`Running 'pipx run --spec eth-wake wake lsp --port ${port}'`);
        return execa(
            `pipx run --spec eth-wake wake lsp --port ${port}`,
            { shell: true, stdio: ['ignore', 'ignore', 'pipe'], env: env }
        );
    }

    async setup(): Promise<void> {
        let pipxList;
        try {
            pipxList = JSON.parse(execaSync("pipx", ["list", "--json"]).stdout.trim());
        } catch(err) {
            this.analytics.logCrash(EventType.ERROR_WAKE_INSTALL_PIPX, err);
            if (err instanceof Error) {
                this.outputChannel.appendLine(err.toString());
            }
            this.outputChannel.appendLine("Unable to list the installed pipx packages.");
            this.outputChannel.show(true);
        }

        try {
            if (!("eth-wake" in pipxList.venvs)) {
                await this.pipxInstall();
                pipxList = JSON.parse(execaSync("pipx", ["list", "--json"]).stdout.trim());
            }

            const version: string = this.getWakeVersion();
            if (compare(version, WAKE_MIN_VERSION) < 0) {
                this.outputChannel.appendLine(`Found 'eth-wake' in version ${version} but the target minimal version is ${WAKE_MIN_VERSION}.`);
                await this.pipxUpgrade();
            }
            this.analytics.setWakeVersion(this.getWakeVersion());
        } catch(err) {
            this.analytics.logCrash(EventType.ERROR_WAKE_INSTALL_PIPX, err);
            if (err instanceof Error) {
                this.outputChannel.appendLine(err.toString());
                this.outputChannel.show(true);
            }
            return;
        }
    }
}