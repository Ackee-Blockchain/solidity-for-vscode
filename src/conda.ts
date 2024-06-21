import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import * as tar from 'tar';
import * as crypto from 'crypto';
import * as tmp from 'tmp';
import { Storage } from '@google-cloud/storage';
import { execaSync } from 'execa';

export class CondaInstaller {
    private readonly bucketName = 'wake-venv';
    private readonly storage = new Storage();
    private readonly publicKey: string;
    private readonly activateCommand: string;

    constructor(private readonly context: vscode.ExtensionContext, private readonly outputChannel: vscode.OutputChannel) {
        const pubkeyPath = context.asAbsolutePath('resources/conda_public_key.pem');
        this.publicKey = fs.readFileSync(pubkeyPath, 'utf8');

        if (process.platform === 'win32') {
            this.activateCommand = '"' + path.join(context.globalStorageUri.fsPath, 'conda', 'Scripts', 'activate.bat') + '"';
        } else {
            this.activateCommand = '. "' + path.join(context.globalStorageUri.fsPath, 'conda', 'bin', 'activate') + '"';
        }
    }

    get certifiPath(): string | undefined {
        try {
            return execaSync(`${this.activateCommand} && python -c "import certifi; print(certifi.where())"`, { shell: true }).stdout;
        } catch (error) {
            return undefined;
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

    async setupConda(): Promise<string> {
        const extractPath = path.join(this.context.globalStorageUri.fsPath, 'conda');

        if (fs.existsSync(path.join(this.context.globalStorageUri.fsPath, '.conda'))) {
            return extractPath;
        }
        this.outputChannel.appendLine('Setting up conda environment...');

        let filename: string = 'wake';
        if (process.platform === 'win32') {
            filename += '-Windows';
        } else if (process.platform === 'darwin') {
            filename += '-macOS';
        } else if (process.platform === 'linux') {
            filename += '-Linux';
        } else {
            throw new Error(`Unsupported platform: ${process.platform}`);
        }

        if (process.arch === 'x64') {
            filename += '-X64';
        } else if (process.arch === 'arm64') {
            filename += '-ARM64';
        } else {
            throw new Error(`Unsupported architecture: ${process.arch}`);
        }

        filename += '.tar.gz';

        await this.verifyAndExtractArchive(extractPath, filename);
        fs.writeFileSync(path.join(this.context.globalStorageUri.fsPath, '.conda'), '');

        return extractPath;
    }
}