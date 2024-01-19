import * as env from './env';
import fetch from 'node-fetch';
import * as vscode from 'vscode';
import { randomUUID } from 'crypto';

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