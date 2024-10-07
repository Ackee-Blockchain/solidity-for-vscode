import { ExecaChildProcess } from 'execa';

export const WAKE_MIN_VERSION = '4.12.1';

export interface Installer {
    setup(): Promise<void>;

    startWake(port: number): ExecaChildProcess;
}
