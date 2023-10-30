import * as vscode from "vscode";

export class WakeDetection {
    uri: vscode.Uri;
    diagnostic: WakeDiagnostic;

    constructor(uri: vscode.Uri, diagnostic: WakeDiagnostic) {
        this.uri = uri;
        this.diagnostic = diagnostic;
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
}

export interface DiagnosticData {
    severity: string;
    impact: string;
    confidence: string;
    ignored: boolean;
    sourceUnitName: string;
}

