import * as vscode from "vscode";

export function getBasePage(
    css: Array<vscode.Uri>,
    js: Array<vscode.Uri>,
    nonce: string,
    csp: string
): string {

    return `<!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <!--
            Use a content security policy to only allow loading images from https or from our extension directory,
            and only allow scripts that have a specific nonce.
        -->
        <meta http-equiv="Content-Security-Policy" content="img-src https: data:; style-src 'unsafe-inline' ${csp}; script-src 'nonce-${nonce}';">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        ${css.map(c => `<link href="${c}" rel="stylesheet">`).join('\n')}
        <link href="" rel="stylesheet">
    </head>
    <body style="padding:10px;">    
        ${js.map(j => `<script nonce="${nonce}" src="${j}"></script>`).join('\n')}
    </body>
    </html>`;
}