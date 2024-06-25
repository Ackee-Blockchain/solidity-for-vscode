import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import * as tar from 'tar';
import * as crypto from 'crypto';
import * as tmp from 'tmp';
import { File, Storage } from '@google-cloud/storage';
import { ExecaChildProcess, execaSync, execa } from 'execa';
import { compare, explain } from '@renovatebot/pep440';
import { Analytics, EventType } from '../Analytics';
import { Installer, WAKE_MIN_VERSION } from './installerInterface';

export class CondaInstaller implements Installer {
    private readonly bucketName = 'wake-venv';
    private readonly storage = new Storage();
    private readonly publicKey: string;
    private readonly markerFile: string;
    private readonly activateCommand: string;
    private readonly shell: string;

    constructor(
        private readonly context: vscode.ExtensionContext,
        private readonly outputChannel: vscode.OutputChannel,
        private readonly analytics: Analytics,
        private readonly prerelease: boolean,
    ) {
        const pubkeyPath = context.asAbsolutePath('resources/conda_public_key.pem');
        this.publicKey = fs.readFileSync(pubkeyPath, 'utf8');
        this.markerFile = path.join(context.globalStorageUri.fsPath, '.conda-version');

        if (process.platform === 'win32') {
            this.activateCommand = '"' + path.join(context.globalStorageUri.fsPath, 'wake-conda', 'Scripts', 'activate.bat') + '"';
            this.shell = 'cmd.exe';
        } else {
            this.activateCommand = '. "' + path.join(context.globalStorageUri.fsPath, 'wake-conda', 'bin', 'activate') + '"';
            this.shell = '/bin/bash';
        }
    }

    private async downloadFile(filename: string, destination: string): Promise<void> {
        await vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: `Downloading ${filename}`,
            cancellable: false
        }, async (progress) => {
            const file = this.storage.bucket(this.bucketName).file(filename);

            const [metadata] = await file.getMetadata();
            const fileSize = metadata.size !== undefined ? (typeof metadata.size === 'string' ? parseInt(metadata.size) : metadata.size) : 0;

            const destFile = fs.createWriteStream(destination);
            const fileStream = file.createReadStream();

            let downloadedBytes = 0;
            let lastPercentage = 0;

            return new Promise<void>((resolve, reject) => {
                fileStream.on('end', () => {
                    destFile.end();
                    resolve();
                });

                fileStream.on('data', (chunk: Buffer) => {
                    if (fileSize !== 0) {
                        downloadedBytes += chunk.length;
                        const percentage = Math.floor((downloadedBytes / fileSize) * 100);
                        progress.report({ increment: percentage - lastPercentage, message: `${percentage}%` });

                        lastPercentage = percentage;
                    }
                });
                fileStream.on('error', (err: Error) => {
                    reject(err);
                });

                fileStream.pipe(destFile);
            });
        });
    }

    private verifySignature(data: Buffer, signature: Buffer): boolean {
        const verify = crypto.createVerify('sha256');
        verify.update(data);
        verify.end();
        return verify.verify(this.publicKey, signature);
    }

    private async verifyAndExtractArchive(extractPath: string, filename: string): Promise<void> {
        const archivePath = tmp.tmpNameSync({ postfix: '.tar.gz' });
        const hashPath = `${archivePath}.sha256`;
        const signaturePath = `${archivePath}.sha256.sig`;

        await this.downloadFile(filename, archivePath);
        await this.downloadFile(`${filename}.sha256`, hashPath);
        await this.downloadFile(`${filename}.sha256.sig`, signaturePath);

        const signature = fs.readFileSync(signaturePath);
        const hashData = fs.readFileSync(hashPath);

        if (!this.verifySignature(hashData, signature)) {
            await vscode.window.showErrorMessage(`Signature verification failed for ${filename}`);
            throw new Error('Signature verification failed');
        }

        const expectedHash = Buffer.from(hashData.toString('utf8').split(/\s+/)[0], 'hex');
        const fileBuffer = fs.readFileSync(archivePath);
        const actualHash = crypto.createHash('sha256').update(fileBuffer).digest();

        if (!expectedHash.equals(actualHash)) {
            await vscode.window.showErrorMessage(`Hash mismatch for ${filename}`);
            throw new Error('Hash mismatch, the file may be corrupted or tampered with.');
        }

        if (fs.existsSync(this.markerFile)) {
            fs.rmSync(this.markerFile);
        }

        if (fs.existsSync(extractPath)) {
            fs.rmSync(extractPath, { recursive: true });
        }
        fs.mkdirSync(extractPath, { recursive: true });

        await vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: `Extracting ${filename}`,
            cancellable: false
        }, async () => {
            await tar.x({
                file: archivePath,
                cwd: extractPath,
            });
        });

        await vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: `Setting up conda environment`,
            cancellable: false
        }, async () => {
            execaSync(`${this.activateCommand} && conda-unpack`, { shell: this.shell });
        });
    }

    async setup(): Promise<void> {
        let platform: string;
        if (process.platform === 'win32') {
            platform = 'windows';
        } else if (process.platform === 'darwin') {
            platform = 'macos';
        } else if (process.platform === 'linux') {
            platform = 'linux';
        } else {
            await vscode.window.showErrorMessage(`Unsupported platform ${process.platform}`);
            throw new Error(`Unsupported platform ${process.platform}`);
        }

        let arch: string;
        if (platform === 'windows' && process.arch === 'arm64') {
            // take advantage of x64 emulation on Windows ARM
            arch = 'x64';
        } else {
            arch = process.arch;
        }

        let promise = new Promise<[File|undefined, string|undefined]>(async (resolve, reject) => {
            let latestVersion = undefined;
            let latestFile = undefined;

            try {
                const [files] = await this.storage.bucket(this.bucketName).getFiles();

                for (const file of files) {
                    const [metadata] = await file.getMetadata();
                    if (metadata.metadata === undefined || !(typeof metadata.metadata['version'] === 'string')) {
                        continue;
                    }

                    const explained = explain(metadata.metadata['version']);
                    if (explained === null) {
                        continue;
                    }

                    if (
                        metadata.metadata['os'] === platform &&
                        metadata.metadata['arch'] === arch &&
                        (latestVersion === undefined || compare(metadata.metadata['version'], latestVersion) > 0) &&
                        (this.prerelease || !explained.is_prerelease)
                    ) {
                        latestVersion = metadata.metadata['version'];
                        latestFile = file;
                    }
                }
            } catch (error) {} // internet connection error most likely

            resolve([latestFile, latestVersion]);
        });

        const extractPath = path.join(this.context.globalStorageUri.fsPath, 'wake-conda');

        let currentVersion = undefined;
        if (fs.existsSync(this.markerFile)) {
            try {
                currentVersion = fs.readFileSync(this.markerFile, 'utf8').trim();
            } catch (error) {}
        }

        if (currentVersion === undefined || compare(currentVersion, WAKE_MIN_VERSION) < 0) {
            if (currentVersion !== undefined) {
                await vscode.window.showInformationMessage(
                    `The conda environment in version ${currentVersion} installed but the minimal version is ${WAKE_MIN_VERSION}. Updating...`,
                );
            }
            let [latestFile, latestVersion] = await promise;

            // no conda environment installed yet
            if (latestFile === undefined || latestVersion === undefined) {
                await vscode.window.showErrorMessage(`No conda environment found for platform ${process.platform} and architecture ${process.arch}`);
                throw new Error(`No conda environment found for platform ${process.platform} and architecture ${process.arch}`);
            }

            await this.verifyAndExtractArchive(extractPath, latestFile.name);
            fs.writeFileSync(this.markerFile, latestVersion);

            // TODO: do we have to restart the extension because of overwritten binaries?

            return;
        } else {
            promise.then(([latestFile, latestVersion]) => {
                if (latestFile === undefined || latestVersion === undefined) {
                    return;
                }

                if (compare(currentVersion, latestVersion) >= 0) {
                    return;
                }

                // offer an update
                // TODO: better message
                const message = `A new conda environment version is available. Would you like to update to version ${latestVersion}?`;

                vscode.window.showInformationMessage(message, 'Yes', 'No').then(async (update) => {
                    if (update === 'Yes') {
                        await this.verifyAndExtractArchive(extractPath, latestFile.name);
                        fs.writeFileSync(this.markerFile, latestVersion);
                    }
                    return update;
                });
            });
        }
    }

    private getCertifiPath(): string | undefined {
        try {
            return execaSync(`${this.activateCommand} && python -c "import certifi; print(certifi.where())"`, { shell: this.shell }).stdout;
        } catch (error) {
            this.analytics.logCrash(EventType.ERROR_CERTIFI_PATH, error);
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

        this.outputChannel.appendLine(`Running '${this.activateCommand} && wake lsp --port ${port}'`);
        return execa(
            `${this.activateCommand} && wake lsp --port ${port}`,
            { shell: this.shell, stdio: ['ignore', 'ignore', 'pipe'], env: env }
        );
    }
}