import * as vscode from 'vscode';
import * as path from 'path';
import { ExecaChildProcess, execaSync, execa } from 'execa';
import { compare } from '@renovatebot/pep440';
import { Installer, WAKE_MIN_VERSION } from './installerInterface';
import { Analytics, EventType } from '../Analytics';

export class ManualInstaller implements Installer {
    protected readonly venvPath: string;
    protected readonly venvActivateCommand: string;
    protected readonly pythonExecutable: string;
    protected readonly shell: string;

    protected venv: boolean = false;
    protected cwd: string | undefined = undefined;

    constructor(
        protected readonly context: vscode.ExtensionContext,
        protected readonly outputChannel: vscode.OutputChannel,
        protected readonly analytics: Analytics,
        protected readonly executablePath: string | null
    ) {
        this.venvPath = path.join(context.globalStorageUri.fsPath, 'wake-venv');

        if (process.platform === 'win32') {
            this.venvActivateCommand =
                '"' + path.join(this.venvPath, 'Scripts', 'activate.bat') + '"';
            this.shell = 'cmd.exe';
        } else {
            this.venvActivateCommand = '. "' + path.join(this.venvPath, 'bin', 'activate') + '"';
            this.shell = '/bin/bash';
        }

        this.pythonExecutable = this.findPython();
    }

    private findPython(): string {
        try {
            const pythonVersion = execaSync('python3', [
                '-c',
                'import sys; print(f"{sys.version_info[0]}.{sys.version_info[1]}.{sys.version_info[2]}")'
            ]).stdout.trim();

            if (compare(pythonVersion, '3.8.0') < 0) {
                this.analytics.logCrash(
                    EventType.ERROR_PYTHON_VERSION,
                    new Error(`Python version too old: ${pythonVersion}`)
                );
                this.outputChannel.appendLine(
                    `Found Python in version ${pythonVersion}. Python >=3.8 must be installed.`
                );
                this.outputChannel.show(true);
                throw new Error('Python version too old');
            }
            return 'python3';
        } catch (err) {
            try {
                const pythonVersion = execaSync('python', [
                    '-c',
                    'import sys; print(f"{sys.version_info[0]}.{sys.version_info[1]}.{sys.version_info[2]}")'
                ]).stdout.trim();

                if (compare(pythonVersion, '3.8.0') < 0) {
                    this.analytics.logCrash(
                        EventType.ERROR_PYTHON_VERSION,
                        new Error(`Python version too old: ${pythonVersion}`)
                    );
                    this.outputChannel.appendLine(
                        `Found Python in version ${pythonVersion}. Python >=3.8 must be installed.`
                    );
                    this.outputChannel.show(true);
                    throw new Error('Python version too old');
                }
                return 'python';
            } catch (err) {
                this.analytics.logCrash(
                    EventType.ERROR_PYTHON_VERSION,
                    new Error('Python not found')
                );
                this.outputChannel.appendLine('Python >=3.8 must be installed.');
                this.outputChannel.show(true);
                throw new Error('Python not found');
            }
        }
    }

    protected getWakeVersion(pathToExecutable: string | null, venv: boolean, cwd?: string): string {
        if (pathToExecutable) {
            return execaSync(pathToExecutable, ['--version']).stdout.trim();
        }
        if (venv) {
            return execaSync(`${this.venvActivateCommand} && wake --version`, {
                shell: this.shell
            }).stdout.trim();
        }
        if (cwd === undefined) {
            return execaSync('wake', ['--version']).stdout.trim();
        } else {
            return execaSync('./wake', ['--version'], { cwd: cwd }).stdout.trim();
        }
    }

    async setup(): Promise<void> {}

    startWake(port: number): ExecaChildProcess {
        let version: string;
        try {
            version = this.getWakeVersion(this.executablePath, this.venv, this.cwd);
            if (compare(version, WAKE_MIN_VERSION) < 0) {
                this.analytics.logEvent(EventType.ERROR_WAKE_VERSION);
                this.outputChannel.appendLine(
                    `PyPi package 'eth-wake' in version ${version} installed but the target minimal version is ${WAKE_MIN_VERSION}.`
                );
                this.outputChannel.show(true);
                throw new Error('Wake version too old');
            }
        } catch (err) {
            this.analytics.logCrash(EventType.ERROR_WAKE_VERSION_UNKNOWN, err);
            if (err instanceof Error) {
                this.outputChannel.appendLine(err.toString());
                this.outputChannel.show(true);
            }
            console.log('Wake not found', err);
            throw new Error('Wake not found');
        }

        this.analytics.setWakeVersion(version);

        const env = { ...process.env, PYTHONIOENCODING: 'utf8' } as { [key: string]: string };

        let certifiPath = undefined;
        if (process.platform === 'darwin') {
            try {
                if (this.venv) {
                    certifiPath = execaSync(
                        `${this.venvActivateCommand} && python -c "import certifi; print(certifi.where())"`,
                        { shell: this.shell }
                    ).stdout;
                } else {
                    certifiPath = execaSync(`${this.pythonExecutable} -m certifi`, {
                        shell: this.shell
                    }).stdout;
                }
            } catch (error) {
                this.analytics.logCrash(EventType.ERROR_CERTIFI_PATH, error);
            }
        }

        if (certifiPath) {
            env.SSL_CERT_FILE = certifiPath;
            env.REQUESTS_CA_BUNDLE = certifiPath;
        }

        if (this.executablePath !== null) {
            this.cwd = path.dirname(this.executablePath);
        }

        const wakePath: string = this.cwd ? path.join(this.cwd, 'wake') : 'wake';

        if (this.venv) {
            this.outputChannel.appendLine(
                `Running '${this.venvActivateCommand} && wake lsp --port ${port}' (v${version})`
            );
            return execa(`${this.venvActivateCommand} && wake lsp --port ${port}`, {
                shell: this.shell,
                stdio: ['ignore', 'ignore', 'pipe'],
                env: env
            });
        } else if (this.cwd === undefined) {
            this.outputChannel.appendLine(`Running '${wakePath} lsp --port ${port}' (v${version})`);
            return execa('wake', ['lsp', '--port', String(port)], {
                shell: this.shell,
                stdio: ['ignore', 'ignore', 'pipe'],
                env: env
            });
        } else {
            this.outputChannel.appendLine(`Running '${wakePath} lsp --port ${port}' (v${version})`);
            const cmd = process.platform === 'win32' ? '.\\wake' : './wake';
            return execa(cmd, ['lsp', '--port', String(port)], {
                cwd: this.cwd,
                shell: this.shell,
                stdio: ['ignore', 'ignore', 'pipe'],
                env: env
            });
        }
    }
}
