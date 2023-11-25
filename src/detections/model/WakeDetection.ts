import * as vscode from "vscode";

export class WakeDetection {
    uri: vscode.Uri;
    diagnostic: WakeDiagnostic;
    detector: Detector;

    constructor(uri: vscode.Uri, diagnostic: WakeDiagnostic) {
        this.uri = uri;
        this.diagnostic = diagnostic;

        if (diagnostic.isCodeObject()) {
            let codeObj = diagnostic.code as Code;
            this.detector = new Detector(codeObj.value as string, codeObj.target);
        } else if (diagnostic.code != undefined) {
            this.detector = new Detector(diagnostic.code as string, undefined);
        } else {
            this.detector = new Detector("unknown", undefined);
        }
    }

    getId(): string {
        return [this.uri.toString(), this.diagnostic.message, this.diagnostic.range.start.line, this.diagnostic.range.start.character, this.diagnostic.range.end.line, this.diagnostic.range.end.character].join(":");
    }

    getImpact(): string | undefined {
        return this.diagnostic.data.impact;
    }
}

export class WakeDiagnostic extends vscode.Diagnostic {
    data: DiagnosticData;

    constructor(range: vscode.Range, message: string, severity: vscode.DiagnosticSeverity, data: DiagnosticData) {
        super(range, message, severity);
        this.data = data;
    }

    isCodeObject(): boolean {
        return this._isCodeObject(this.code);
    }

    private _isCodeObject(obj: any): obj is Code {
        try {
            return (typeof obj.value === 'string' || typeof obj.value === 'number' && typeof obj.target === 'object');
        } catch (e) {
            return false;
        }
    }
}

export interface DiagnosticData {
    severity: string;
    impact: string;
    confidence: string;
    ignored: boolean;
    sourceUnitName: string;
}

export interface Code {
    value: string | number;
    target: vscode.Uri;
}

export class Detector {
    id: string;
    docs: vscode.Uri | undefined;

    constructor(id : string, docs : vscode.Uri | undefined = undefined){
        this.id = id;
        this.docs = docs;
    }
}

