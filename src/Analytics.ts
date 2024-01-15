import * as env from './env';
import fetch from 'node-fetch';
import * as vscode from 'vscode';
import { randomUUID } from 'crypto';

export class Analytics{

    session_id : string = randomUUID();

    getUuid(): string {
        let config = vscode.workspace.getConfiguration("Tools-for-Solidity")
        let value = config.inspect("uuid");
        if (value?.globalValue == undefined) {
            let uuid = randomUUID()
            config.update("uuid", uuid, vscode.ConfigurationTarget.Global);
            return uuid;
        } else {
            return value.globalValue as string;
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
                        engagement_time_msec: 1
                    },
                }]
            })
        });
    }
}

export enum EventType{
    ACTIVATE = "activate",
    MIGRATE = "migrate"
}