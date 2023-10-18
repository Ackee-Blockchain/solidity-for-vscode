import * as vscode from 'vscode';
import {
    Diagnostic,
    DiagnosticSeverity,
    Range
} from 'vscode-languageclient/node';
import { WakeDiagnostic,
        DiagnosticData  } from './detections';

export function convertDiagnostics(it: Diagnostic): WakeDiagnostic {
    let severity: vscode.DiagnosticSeverity;
    switch (it.severity) {
        case DiagnosticSeverity.Information:
            severity = vscode.DiagnosticSeverity.Information
            break;
        case DiagnosticSeverity.Warning:
            severity = vscode.DiagnosticSeverity.Warning
            break;
        case DiagnosticSeverity.Error:
            severity = vscode.DiagnosticSeverity.Error
            break;
        default:
            severity = vscode.DiagnosticSeverity.Hint
            break;
    }
    let result = new WakeDiagnostic(convertRange(it.range), it.message, severity, it.data)
    result.source = it.source;
    result.code = it.code;
    result.relatedInformation = it.relatedInformation?.map(it => new vscode.DiagnosticRelatedInformation(new vscode.Location(vscode.Uri.parse(it.location.uri), convertRange(it.location.range)), it.message));
    result.data = it.data as DiagnosticData
    result.tags = it.tags;
    return result;
}

function convertRange(it : Range) : vscode.Range{
    return new vscode.Range(new vscode.Position(it.start.line, it.start.character), new vscode.Position(it.start.line, it.start.character))
}