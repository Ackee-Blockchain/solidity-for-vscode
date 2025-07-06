import * as vscode from 'vscode';
import * as env from './env';
import appState from './sake/state/shared/AppState';
import { extensionState } from './sake/state/shared/ExtensionState';

let appInsights = require('applicationinsights');

class TelemetrySender implements vscode.TelemetrySender {
    sendEventData(eventName: string, data?: Record<string, any> | undefined): void {
        if (appInsights.defaultClient) {
            appInsights.defaultClient.trackEvent({
                name: eventName,
                properties: data
            });
        }
    }

    sendErrorData(error: Error, data?: Record<string, any> | undefined): void {
        if (appInsights.defaultClient) {
            appInsights.defaultClient.trackException({
                exception: error,
                properties: data
            });
        }
    }
}

export class Analytics {
    context: vscode.ExtensionContext | undefined;
    telemetryLogger: vscode.TelemetryLogger | undefined;
    wakeVersion: string | undefined;
    correctPythonPath: boolean | undefined;
    correctSysPath: boolean | undefined;
    installation: string | undefined;
    private isInitialized: boolean = false;

    public initialize(context: vscode.ExtensionContext, installation: string) {
        try {
            // Only initialize Application Insights if we have a valid telemetry key
            if (env.TELEMETRY_KEY && env.TELEMETRY_KEY.trim() !== '') {
                appInsights
                    .setup(env.TELEMETRY_KEY)
                    .setAutoCollectRequests(false)
                    .setAutoCollectPerformance(false)
                    .setAutoCollectExceptions(false)
                    .setAutoCollectDependencies(false)
                    .setAutoDependencyCorrelation(false)
                    .setAutoCollectConsole(false)
                    .setUseDiskRetryCaching(true)
                    .start();
                
                const { userId, sessionId } = appInsights.defaultClient.context.keys;
                appInsights.defaultClient.context.tags[userId] = vscode.env.machineId;
                appInsights.defaultClient.context.tags[sessionId] = vscode.env.sessionId;
            } else {
                console.log('Telemetry key not provided, Application Insights disabled');
            }

            this.context = context;
            this.telemetryLogger = vscode.env.createTelemetryLogger(new TelemetrySender());
            this.wakeVersion = undefined;
            this.correctPythonPath = undefined;
            this.correctSysPath = undefined;
            this.installation = installation;
            this.isInitialized = true;

            context.subscriptions.push(this.telemetryLogger);
        } catch (error) {
            console.error('Failed to initialize Analytics:', error);
            // Don't throw the error - allow extension to continue without telemetry
            this.isInitialized = false;
        }
    }

    public setWakeVersion(version: string) {
        this.wakeVersion = version;
    }

    public setCorrectPythonPath(correct: boolean) {
        this.correctPythonPath = correct;
    }

    public setCorrectSysPath(correct: boolean) {
        this.correctSysPath = correct;
    }

    logActivate() {
        this.logEvent(EventType.ACTIVATE);
    }

    logMigrate() {
        this.logEvent(EventType.MIGRATE);
    }

    logEvent(name: string) {
        if (!this.isInitialized || this.telemetryLogger === undefined || this.context === undefined) {
            console.log(`Analytics not initialized, skipping event: ${name}`);
            return;
        }

        try {
            this.telemetryLogger.logUsage(name, {
                'common.extname': this.context.extension.packageJSON.name as string,
                'common.extversion': this.context.extension.packageJSON.version as string,
                'common.vscodemachineid': vscode.env.machineId,
                'common.vscodeseesionid': vscode.env.sessionId,
                'common.vscodeversion': vscode.version,
                'common.os': process.platform.toString(),
                'common.nodeArch': process.arch,
                installation: this.installation,
                'wake.version': this.wakeVersion || 'unknown'
            });
        } catch (error) {
            console.error('Failed to log event:', error);
        }
    }

    logCrash(event: EventType, error: any) {
        if (!this.isInitialized || this.telemetryLogger === undefined || this.context === undefined) {
            console.log(`Analytics not initialized, skipping crash log: ${event}`);
            return;
        }

        try {
            let data: any = {
                'common.extname': this.context.extension.packageJSON.name as string,
                'common.extversion': this.context.extension.packageJSON.version as string,
                'common.vscodemachineid': vscode.env.machineId,
                'common.vscodeseesionid': vscode.env.sessionId,
                'common.vscodeversion': vscode.version,
                'common.os': process.platform.toString(),
                'common.nodeArch': process.arch,
                installation: this.installation,
                'wake.version': this.wakeVersion || 'unknown',
                error: error.toString().slice(-8100),
                correctPythonPath: this.correctPythonPath,
                correctSysPath: this.correctSysPath
            };

            if (event === EventType.ERROR_SAKE) {
                const app = appState.get();
                data = {
                    ...data,
                    'sake.appstate.initializationState': app.initializationState,
                    'sake.appstate.isAnvilInstalled': app.isAnvilInstalled,
                    'sake.appstate.isWakeServerRunning': app.isWakeServerRunning,
                    'sake.appstate.isOpenWorkspace': app.isOpenWorkspace,
                    'sake.chainstate.currentChainId': extensionState.get().currentChainId
                };
            }
            this.telemetryLogger.logError(event, data);
        } catch (error) {
            console.error('Failed to log crash:', error);
        }
    }
}

export const analytics = new Analytics();

export enum EventType {
    ACTIVATE = 'activate',
    MIGRATE = 'migrate',
    ERROR_PYTHON_VERSION = 'error_python_version',
    ERROR_PIP_INSTALL = 'error_pip_install',
    ERROR_CONDA_INSTALL = 'error_conda_install',
    ERROR_CERTIFI_PATH = 'error_certifi_path',
    ERROR_WAKE_INSTALL_PIPX = 'error_wake_install_pipx',
    ERROR_WAKE_INSTALL_PIP = 'error_wake_install_pip',
    ERROR_WAKE_VERSION = 'error_wake_version',
    ERROR_WAKE_VERSION_UNKNOWN = 'error_wake_version_unknown',
    ERROR_WAKE_CRASH = 'error_wake_crash',
    ERROR_WAKE_CONNECTION_ERROR_CONTINUE = 'error_wake_connection_error_continue',
    ERROR_WAKE_CONNECTION_ERROR_SHUTDOWN = 'error_wake_connection_error_shutdown',
    ERROR_WAKE_CONNECTION_CLOSE_RESTART = 'error_wake_connection_close_restart',
    ERROR_WAKE_CONNECTION_CLOSE_DO_NOT_RESTART = 'error_wake_connection_close_do_not_restart',
    ERROR_WAKE_SERVER_SHOW_MESSAGE_ERROR = 'error_wake_server_show_message_error',
    ERROR_WAKE_SERVER_LOG_MESSAGE_ERROR = 'error_wake_server_log_message_error',
    ERROR_SAKE = 'error_sake'
}
