import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import * as tar from 'tar';
import * as crypto from 'crypto';
import * as tmp from 'tmp';
import { Storage } from '@google-cloud/storage';
import { ExecaChildProcess, execaSync, execa } from 'execa';
import { compare } from '@renovatebot/pep440';
import { Analytics, EventType } from '../Analytics';
import { Installer } from './installerInterface';

export class CondaInstaller implements Installer {
    private readonly bucketName = 'wake-venv';
    private readonly storage = new Storage();
    private readonly publicKey: string;
    private readonly markerFile: string;
    private readonly activateCommand: string;

    constructor(
        private readonly context: vscode.ExtensionContext,
        private readonly outputChannel: vscode.OutputChannel,
        private readonly analytics: Analytics,
    ) {
        const pubkeyPath = context.asAbsolutePath('resources/conda_public_key.pem');
        this.publicKey = fs.readFileSync(pubkeyPath, 'utf8');
        this.markerFile = path.join(context.globalStorageUri.fsPath, '.conda-version');

        if (process.platform === 'win32') {
            this.activateCommand = '"' + path.join(context.globalStorageUri.fsPath, 'conda', 'Scripts', 'activate.bat') + '"';
        } else {
            this.activateCommand = '. "' + path.join(context.globalStorageUri.fsPath, 'conda', 'bin', 'activate') + '"';
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
            const fileSize = metadata.size;

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
                    downloadedBytes += chunk.length;
                    const percentage = Math.floor((downloadedBytes / fileSize) * 100);
                    progress.report({ increment: percentage - lastPercentage, message: `${percentage}%` });

                    lastPercentage = percentage;
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
            throw new Error('Signature verification failed');
        }

        const expectedHash = Buffer.from(hashData.toString('utf8').split(/\s+/)[0], 'hex');
        const fileBuffer = fs.readFileSync(archivePath);
        const actualHash = crypto.createHash('sha256').update(fileBuffer).digest();

        if (!expectedHash.equals(actualHash)) {
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
            execaSync(`${this.activateCommand} && conda-unpack`, { shell: true });
        });
    }

    async setup(): Promise<void> {
        const [files] = await this.storage.bucket(this.bucketName).getFiles();

        let latestVersion = undefined;
        let latestFile = undefined;
        let platform;
        if (process.platform === 'win32') {
            platform = 'windows';
        } else if (process.platform === 'darwin') {
            platform = 'macos';
        } else if (process.platform === 'linux') {
            platform = 'linux';
        } else {
            throw new Error(`Unsupported platform ${process.platform}`);
        }
        // arch can be used as is

        for (const file of files) {
            const [metadata] = await file.getMetadata();
            if (metadata.metadata === undefined || !(typeof metadata.metadata['version'] === 'string')) {
                continue;
            }
            if (
                metadata.metadata['os'] === platform &&
                metadata.metadata['arch'] === process.arch &&
                (latestVersion === undefined || compare(metadata.metadata['version'], latestVersion) > 0)
            ) {
                latestVersion = metadata.metadata['version'];
                latestFile = file;
            }
        }

        if (latestFile === undefined || latestVersion === undefined) {
            throw new Error(`No conda environment available for platform ${process.platform} and architecture ${process.arch}`);
        }

        const extractPath = path.join(this.context.globalStorageUri.fsPath, 'conda');

        if (!fs.existsSync(this.markerFile)) {
            // no conda environment installed yet
            await this.verifyAndExtractArchive(extractPath, latestFile.name);
            fs.writeFileSync(this.markerFile, latestVersion);

            // TODO: do we have to restart the extension because of overwritten binaries?

            return;
        }

        const currentVersion = fs.readFileSync(this.markerFile, 'utf8').trim();
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
    }

    private getCertifiPath(): string | undefined {
        try {
            return execaSync(`${this.activateCommand} && python -c "import certifi; print(certifi.where())"`, { shell: true }).stdout;
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
            { shell: true, stdio: ['ignore', 'ignore', 'pipe'], env: env }
        );
    }
}