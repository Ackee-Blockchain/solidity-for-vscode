import * as env from './env';
import * as vscode from 'vscode';
import TelemetryReporter from '@vscode/extension-telemetry';

export class Analytics{

    context : vscode.ExtensionContext;
    reporter : TelemetryReporter;

    constructor(context: vscode.ExtensionContext){
        this.context = context;

        this.reporter = new TelemetryReporter(env.TELEMETRY_KEY);
        context.subscriptions.push(this.reporter);
    }

    logActivate(){
        this.logEvent(EventType.ACTIVATE);
    }

    logMigrate() {
        this.logEvent(EventType.MIGRATE);
    }

    logEvent(name: string) {
        this.reporter.sendTelemetryEvent(
            name,
            {
                'common.extname': this.context.extension.packageJSON.name as string,
                'common.extversion': this.context.extension.packageJSON.version as string,
                'common.vscodemachineid': vscode.env.machineId,
                'common.vscodeseesionid': vscode.env.sessionId,
                'common.vscodeversion': vscode.version,
                'common.os': process.platform.toString(),
                'common.nodeArch': process.arch,
            }
        );
    }

    logCrash(event: EventType, error: any) {
        this.reporter.sendTelemetryErrorEvent(
            event,
            {
                'common.extname': this.context.extension.packageJSON.name as string,
                'common.extversion': this.context.extension.packageJSON.version as string,
                'common.vscodemachineid': vscode.env.machineId,
                'common.vscodeseesionid': vscode.env.sessionId,
                'common.vscodeversion': vscode.version,
                'common.os': process.platform.toString(),
                'common.nodeArch': process.arch,
                'error': error.toString().slice(-8100)
            }
        );
    }
}

export enum EventType{
    ACTIVATE = "activate",
    MIGRATE = "migrate",
    ERROR_PIP_INSTALL = "error_pip_install",
    ERROR_WAKE_INSTALL_PIPX = "error_wake_install_pipx",
    ERROR_WAKE_INSTALL_PIP = "error_wake_install_pip",
    ERROR_WAKE_VERSION = "error_wake_version",
    ERROR_WAKE_VERSION_UNKNOWN = "error_wake_version_unknown",
    ERROR_WAKE_CRASH = "error_wake_crash",
    ERROR_WAKE_CONNECTION_ERROR_CONTINUE = "error_wake_connection_error_continue",
    ERROR_WAKE_CONNECTION_ERROR_SHUTDOWN = "error_wake_connection_error_shutdown",
    ERROR_WAKE_CONNECTION_CLOSE_RESTART = "error_wake_connection_close_restart",
    ERROR_WAKE_CONNECTION_CLOSE_DO_NOT_RESTART = "error_wake_connection_close_do_not_restart"
}