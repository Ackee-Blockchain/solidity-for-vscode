import * as vscode from 'vscode';
import {
    Diagnostic,
    DiagnosticSeverity,
    Range
} from 'vscode-languageclient/node';
import { WakeDiagnostic } from './model/WakeDetection';
import { DiagnosticData } from './model/WakeDetection';

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

    if (it.codeDescription?.href != undefined && it.code != undefined){
        result.code = {
            value: it.code,
            target: vscode.Uri.parse(it.codeDescription.href)
        }
    } else {
        result.code = it.code
    }

    result.relatedInformation = it.relatedInformation?.map(it => new vscode.DiagnosticRelatedInformation(new vscode.Location(vscode.Uri.parse(it.location.uri), convertRange(it.location.range)), it.message));
    result.data = it.data as DiagnosticData
    result.tags = it.tags;
    return result;
}

function convertRange(it : Range) : vscode.Range{
    return new vscode.Range(new vscode.Position(it.start.line, it.start.character), new vscode.Position(it.end.line, it.end.character))
}

export interface IgnoreComment {
    line: number;
    detectorId?: string;
    isGlobal: boolean;
}

export function parseIgnoreComments(document: vscode.TextDocument): IgnoreComment[] {
    const ignoreComments: IgnoreComment[] = [];
    const ignorePattern = /\/\/\s*(wake-ignore|wake-disable|wake-suppress)(?:\s+(\w+))?/i;
    const blockIgnorePattern = /\/\*\s*(wake-ignore|wake-disable|wake-suppress)(?:\s+(\w+))?\s*\*\//i;
    
    for (let i = 0; i < document.lineCount; i++) {
        const line = document.lineAt(i);
        const lineText = line.text;
        
        // Check for line comments
        const lineMatch = lineText.match(ignorePattern);
        if (lineMatch) {
            ignoreComments.push({
                line: i,
                detectorId: lineMatch[2] || undefined,
                isGlobal: !lineMatch[2]
            });
            continue;
        }
        
        // Check for block comments on the same line
        const blockMatch = lineText.match(blockIgnorePattern);
        if (blockMatch) {
            ignoreComments.push({
                line: i,
                detectorId: blockMatch[2] || undefined,
                isGlobal: !blockMatch[2]
            });
        }
    }
    
    return ignoreComments;
}

export function shouldIgnoreDetection(
    detection: WakeDiagnostic, 
    ignoreComments: IgnoreComment[]
): boolean {
    const detectionLine = detection.range.start.line;
    
    for (const ignoreComment of ignoreComments) {
        // Check if the ignore comment is on the same line or the line before
        if (ignoreComment.line === detectionLine || ignoreComment.line === detectionLine - 1) {
            // If it's a global ignore (no specific detector), ignore all detections
            if (ignoreComment.isGlobal) {
                return true;
            }
            
            // If it's a specific detector ignore, check if the detector ID matches
            if (ignoreComment.detectorId && detection.code) {
                let detectorId: string;
                if (typeof detection.code === 'string') {
                    detectorId = detection.code;
                } else if (detection.code && typeof detection.code === 'object' && 'value' in detection.code) {
                    detectorId = String(detection.code.value);
                } else {
                    continue;
                }
                
                if (detectorId === ignoreComment.detectorId) {
                    return true;
                }
            }
        }
    }
    
    return false;
}
