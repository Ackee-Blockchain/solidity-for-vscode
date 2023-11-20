import * as vscode from 'vscode';
import {
    HandleWorkDoneProgressSignature,
    Middleware, ProgressToken, WorkDoneProgressBegin, WorkDoneProgressEnd, WorkDoneProgressReport
} from 'vscode-languageclient';

export class ClientMiddleware implements Middleware {

    compilationToken: ProgressToken | undefined
    detectionsToken: ProgressToken | undefined
    outputChannel: vscode.OutputChannel

    constructor(outputChannel: vscode.OutputChannel){
        this.outputChannel = outputChannel;
    }

    handleWorkDoneProgress?: ((this: void, token: ProgressToken, params: WorkDoneProgressBegin | WorkDoneProgressReport | WorkDoneProgressEnd, next: HandleWorkDoneProgressSignature) => void) = (token, params, next) => {
        if (this.compilationToken == undefined && params.kind == "begin" && params.title == "Compiling"){
            //TODO compilation progress startß
            this.compilationToken = token;
        } else if(this.compilationToken != undefined){
            if (params.kind == "end"){
                //TODO compilation progress end
                this.compilationToken = undefined;
            }
        }

        if (this.detectionsToken == undefined && params.kind == "begin" && params.title == "Running detectors") {
            //TODO detections progress start
            this.detectionsToken = token;
        } else if (this.detectionsToken != undefined) {
            if (params.kind == "end") {
                //TODO detections progress end
                this.detectionsToken = undefined;
            }
        }
        next(token, params);
    }
}