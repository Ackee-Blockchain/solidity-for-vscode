import * as env from './env.example';
import fetch from 'node-fetch';
import * as vscode from 'vscode';
import { randomUUID } from 'crypto';


const didAllowFeedbackKey = "didAllowFeedback";

export class Analytics{

    context : vscode.ExtensionContext
    session_id : string = randomUUID();

    constructor(context: vscode.ExtensionContext){
        this.context = context;
    }

    getUuid(): string {
        let value = this.context.globalState.get("uuid");
        if (value == undefined) {
            let uuid = randomUUID()
            this.context.globalState.update("uuid", uuid);
            return uuid;
        } else {
            return value as string;
        }
    }

    logActivate(){
        this.logEvent(EventType.ACTIVATE)
    }

    logMigrate() {
        this.logEvent(EventType.MIGRATE)
    }

    logEvent(name: string) {
        fetch(`https://www.google-analytics.com/mp/collect?measurement_id=${env.GA_MEASUREMENT_ID}&api_secret=${env.GA_API_KEY}`, {
            method: "POST",
            body: JSON.stringify({
                client_id: this.getUuid(),
                events: [{
                    name: name,
                    params: {
                        session_id: this.session_id,
                        version: this.context.extension.packageJSON.version as string,
                        platform: process.platform.toString(),
                        engagement_time_msec: 1
                    }
                }]
            })
        });
    }

    logCrash(event: EventType, error: any) {
        // should not show a message to the user
        // just a testing placeholder
        // vscode.window.showInformationMessage("Thank you for your feedback!");
    }

    async askCrashReport(event: EventType, error: any) {
        const didAllowFeedback = await this.context.globalState.get(didAllowFeedbackKey);
        if (didAllowFeedback === UserAnalyticsPreference.NEVER) {
            return;
        }

        if (didAllowFeedback === UserAnalyticsPreference.ALWAYS) {
            this.logCrash(event, error);
            return;
        }

        const allowedFeedback = await vscode.window.showErrorMessage("Wake has crashed. Would you like to provide feedback?", 
            UserAnalyticsPreference.YES, UserAnalyticsPreference.ALWAYS, UserAnalyticsPreference.NEVER); 

        if (allowedFeedback === UserAnalyticsPreference.ALWAYS || allowedFeedback === UserAnalyticsPreference.NEVER) {
            this.context.globalState.update(didAllowFeedbackKey, allowedFeedback);
        }

        if (allowedFeedback === UserAnalyticsPreference.YES || allowedFeedback === UserAnalyticsPreference.ALWAYS) {
            this.logCrash(event, error);
        }
    }
}

enum UserAnalyticsPreference {
    YES = "Yes",
    ALWAYS = "Always",
    NEVER = "Never"
}

export enum EventType{
    ACTIVATE = "activate",
    MIGRATE = "migrate",
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