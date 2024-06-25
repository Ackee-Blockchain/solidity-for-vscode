import * as vscode from "vscode";
import * as fs from 'fs';
import * as https from 'https';
import * as tmp from 'tmp';
import { execaSync } from 'execa';
import { compare } from '@renovatebot/pep440';
import { WAKE_MIN_VERSION } from "./installerInterface";
import { ManualInstaller } from "./manual";
import { Analytics, EventType } from "../Analytics";

export class PipInstaller extends ManualInstaller {
    constructor(
        protected readonly context: vscode.ExtensionContext,
        protected readonly outputChannel: vscode.OutputChannel,
        protected readonly analytics: Analytics,
        protected readonly executablePath: string | null,
        private readonly prerelease: boolean,
    ) {
        super(context, outputChannel, analytics, executablePath);
    }

    async checkWakeInstalled(venv: boolean, cwd?: string): Promise<boolean> {
        try {
            const version: string = this.getWakeVersion(null, venv, cwd);

            if (compare(version, WAKE_MIN_VERSION) < 0) {
                if (cwd === undefined) {
                    this.outputChannel.appendLine(`Found 'eth-wake' in version ${version} in PATH but the target minimal version is ${WAKE_MIN_VERSION}.`);
                } else {
                    this.outputChannel.appendLine(`Found 'eth-wake' in version ${version} in '${cwd}' but the target minimal version is ${WAKE_MIN_VERSION}.`);
                }
                return false;
            }
            return true;
        } catch(err) {
            return false;
        }
    }

    async findWakeDir(): Promise<[boolean, boolean, string|undefined]> {
        let installed: boolean = await this.checkWakeInstalled(false);
        let venv: boolean = false;
        let cwd: string|undefined = undefined;

        if (!installed) {
            const globalPackages = execaSync(this.pythonExecutable, ["-c", 'import os, sysconfig; print(sysconfig.get_path("scripts"))']).stdout.trim();
            installed = await this.checkWakeInstalled(false, globalPackages);
            if (installed) {
                this.outputChannel.appendLine(`Consider adding '${globalPackages}' to your PATH environment variable.`);
                cwd = globalPackages;
            }
        }
        if (!installed) {
            const userPackages = execaSync(this.pythonExecutable, ["-c", 'import os, sysconfig; print(sysconfig.get_path("scripts",f"{os.name}_user"))']).stdout.trim();
            installed = await this.checkWakeInstalled(false, userPackages);
            if (installed) {
                this.outputChannel.appendLine(`Consider adding '${userPackages}' to your PATH environment variable.`);
                cwd = userPackages;
            }
        }
        if (!installed && fs.existsSync(this.venvPath)) {
            installed = await this.checkWakeInstalled(true);
            if (installed) {
                venv = true;
            }
        }

        return [installed, venv, cwd];
    }

    async installPip() {
        var tempFile = tmp.fileSync({ mode: 0o644 });
        const url = "https://bootstrap.pypa.io/get-pip.py";

        this.outputChannel.appendLine(`Downloading ${url} to ${tempFile.name}`);

        await vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: `Installing pip`,
            cancellable: false
        }, async () => {
            await new Promise<void>((resolve, reject) => {
                https.get(url, (response) => {
                    if (response.statusCode !== 200) {
                        reject(new Error(`Failed to download ${url}: ${response.statusCode}`));
                        return;
                    }

                    const file = fs.createWriteStream(tempFile.name);
                    response.pipe(file);

                    file.on('finish', () => {
                        file.close((err) => {
                            if (err) {
                                reject(err);
                                return;
                            }

                            this.outputChannel.appendLine(`Running '${this.pythonExecutable} ${tempFile.name} --user'`);

                            try {
                                const result = execaSync(this.pythonExecutable, [tempFile.name, "--user"]);
                                if (result.exitCode !== 0) {
                                    reject(new Error(`Failed to install pip: ${result.stderr}`));
                                    return;
                                }
                            } catch(err) {
                                reject(err);
                                return;
                            }

                            resolve();
                        });
                    }).on('error', (err) => {
                        reject(err);
                    });
                }).on('error', (err) => {
                    reject(err);
                });
            });
        });
    }

    async installWake(): Promise<boolean> {
        // check if pip is available and install it if not
        try {
            execaSync(this.pythonExecutable, ["-m", "pip", "--version"]);
        } catch(err) {
            try {
                this.outputChannel.appendLine(`Running '${this.pythonExecutable} -m ensurepip'`);
                execaSync(this.pythonExecutable, ["-m", "ensurepip"]);
            } catch(err) {
                if (err instanceof Error) {
                    this.outputChannel.appendLine("Failed to install pip:");
                    this.outputChannel.appendLine(err.toString());
                }
                try {
                    this.outputChannel.appendLine(`Running '${this.pythonExecutable} -m ensurepip --user'`);
                    execaSync(this.pythonExecutable, ["-m", "ensurepip", "--user"]);
                } catch(err) {
                    if (err instanceof Error) {
                        this.outputChannel.appendLine("Failed to install pip into user site-packages:");
                        this.outputChannel.appendLine(err.toString());
                    }
                    try {
                        await this.installPip();
                    } catch(err) {
                        this.analytics.logCrash(EventType.ERROR_PIP_INSTALL, err);

                        if (err instanceof Error) {
                            this.outputChannel.appendLine("Failed to install pip:");
                            this.outputChannel.appendLine(err.toString());
                            this.outputChannel.show(true);
                        }

                        return false;
                    }
                }
            }
        }

        try {
            let out = "";
            let message;

            if (this.prerelease) {
                message = `Running '${this.pythonExecutable} -m pip install eth-wake -U --pre'`;
            } else {
                message = `Running '${this.pythonExecutable} -m pip install eth-wake -U'`;
            }
            this.outputChannel.appendLine(message);

            await vscode.window.withProgress({
                location: vscode.ProgressLocation.Notification,
                title: message,
                cancellable: false
            }, async () => {
                out = execaSync(this.pythonExecutable, ["-m", "pip", "install", "eth-wake", "-U", "--pre"]).stdout;
                if (this.prerelease) {
                    out = execaSync(this.pythonExecutable, ["-m", "pip", "install", "eth-wake", "-U", "--pre"]).stdout;
                } else {
                    out = execaSync(this.pythonExecutable, ["-m", "pip", "install", "eth-wake", "-U"]).stdout;
                }
            });
            if (out.trim().length > 0) {
                this.outputChannel.appendLine(out);
            }
            return true;
        } catch(err) {
            if (err instanceof Error) {
                this.outputChannel.appendLine("Failed to execute the previous command:");
                this.outputChannel.appendLine(err.toString());
            }

            try {
                let out = "";
                let message;

                if (this.prerelease) {
                    message = `Running '${this.pythonExecutable} -m pip install eth-wake -U --pre --user'`;
                } else {
                    message = `Running '${this.pythonExecutable} -m pip install eth-wake -U --user'`;
                }
                this.outputChannel.appendLine(message);

                await vscode.window.withProgress({
                    location: vscode.ProgressLocation.Notification,
                    title: message,
                    cancellable: false
                }, async () => {
                    if (this.prerelease) {
                        out = execaSync(this.pythonExecutable, ["-m", "pip", "install", "eth-wake", "-U", "--pre", "--user"]).stdout;
                    } else {
                        out = execaSync(this.pythonExecutable, ["-m", "pip", "install", "eth-wake", "-U", "--user"]).stdout;
                    }
                });
                if (out.trim().length > 0) {
                    this.outputChannel.appendLine(out);
                }
                return true;
            } catch(err) {
                if (err instanceof Error) {
                    this.outputChannel.appendLine("Failed to install PyPi package 'eth-wake':");
                    this.outputChannel.appendLine(err.toString());
                }

                try {
                    if (!fs.existsSync(this.venvPath)) {
                        this.outputChannel.appendLine(`Running '${this.pythonExecutable} -m venv ${this.venvPath}'`);
                        execaSync(this.pythonExecutable, ["-m", "venv", this.venvPath]);
                    }

                    let out = "";
                    let message;

                    if (this.prerelease) {
                        message = `Running '${this.venvActivateCommand} && pip install eth-wake -U --pre'`;
                    } else {
                        message = `Running '${this.venvActivateCommand} && pip install eth-wake -U'`;
                    }
                    this.outputChannel.appendLine(message);

                    await vscode.window.withProgress({
                        location: vscode.ProgressLocation.Notification,
                        title: message,
                        cancellable: false
                    }, async () => {
                        if (this.prerelease) {
                            out = execaSync(`${this.venvActivateCommand} && pip install eth-wake -U --pre`, { shell: this.shell }).stdout;
                        } else {
                            out = execaSync(`${this.venvActivateCommand} && pip install eth-wake -U`, { shell: this.shell }).stdout;
                        }
                    });
                    if (out.trim().length > 0) {
                        this.outputChannel.appendLine(out);
                    }
                    return true;
                } catch(err) {
                    this.analytics.logCrash(EventType.ERROR_WAKE_INSTALL_PIP, err);

                    if (err instanceof Error) {
                        this.outputChannel.appendLine("Failed to install PyPi package 'eth-wake' into venv:");
                        this.outputChannel.appendLine(err.toString());
                        this.outputChannel.show(true);
                    }

                    return false;
                }
            }
        }
    }

    async setup(): Promise<void> {
        let installed;
        [installed, this.venv, this.cwd] = await this.findWakeDir();
        if (!installed) {
            this.outputChannel.appendLine("Installing PyPi package 'eth-wake'.");
            installed = await this.installWake();

            if (installed) {
                [installed, this.venv, this.cwd] = await this.findWakeDir();

                if (!installed) {
                    this.outputChannel.appendLine("'eth-wake' installed but cannot be found in PATH or pip site-packages.");
                }
            }
        }
    }
}