import * as vscode from 'vscode';
import * as prettier from 'prettier';
// @dev require due to missing types
const prettierPluginSolidity = require('prettier-plugin-solidity');

/**
 * Provides formatting capabilities for Solidity files using Prettier
 * with the Solidity plugin
 */
export class PrettierFormatter implements vscode.DocumentFormattingEditProvider {
    /**
     * Formats the entire document and returns the edits needed to format it
     * @param document The document to format
     * @returns An array of text edits that describe the formatting changes
     */
    public async provideDocumentFormattingEdits(
        document: vscode.TextDocument
    ): Promise<vscode.TextEdit[]> {
        const formattedText = await this.format(document);

        const fullTextRange = new vscode.Range(
            document.lineAt(0).range.start,
            document.lineAt(document.lineCount - 1).range.end
        );

        return [vscode.TextEdit.replace(fullTextRange, formattedText)];
    }

    /**
     * Formats the given document using Prettier
     * @param document The document to format
     * @returns A promise that resolves to the formatted text
     */
    public async format(document: vscode.TextDocument): Promise<string> {
        const options = await this._getOptions(document);

        return await prettier.format(document.getText(), options);
    }

    /**
     * Gets the Prettier formatting options for the document.
     * Attempts to load config from the project, falling back to defaults if none found.
     * @param document The document to get options for
     * @returns The Prettier options to use for formatting, including required Solidity parser and plugin
     * @private
     */
    private async _getOptions(document: vscode.TextDocument) {
        // Define required options for Solidity formatting
        const options = {
            parser: 'solidity-parse', // Use the Solidity parser from prettier-plugin-solidity
            plugins: [prettierPluginSolidity] // Include the Solidity plugin
        };

        try {
            // Try to load Prettier config from the project
            // - Looks for .prettierrc, package.json etc.
            // - useCache: false ensures fresh config each time
            // - editorconfig: true allows .editorconfig to influence formatting
            // - Falls back to defaultConfig if no config found
            const config =
                (await prettier.resolveConfig(document.uri.fsPath, {
                    useCache: false,
                    editorconfig: true
                })) ?? defaultConfig;

            // Merge loaded/default config with required Solidity options
            // Options takes precedence to ensure parser and plugin are set
            return {
                ...config,
                ...options
            };
        } catch (err) {
            // If config resolution fails, fall back to default config
            // Still merge with required Solidity options
            return {
                ...defaultConfig,
                ...options
            };
        }
    }
}

/**
 * Default Prettier configuration options used when no project config is found.
 * These options are based on the recommended settings from prettier-plugin-solidity.
 * See: https://github.com/prettier-solidity/prettier-plugin-solidity#configuration-file
 */
const defaultConfig: prettier.Options = {
    overrides: [
        {
            files: '*.sol',
            options: {
                printWidth: 80,
                tabWidth: 4,
                useTabs: false,
                singleQuote: false,
                bracketSpacing: false,
                explicitTypes: 'preserve',
                compiler: '0.8.19',
                semi: true
            }
        }
    ]
};
