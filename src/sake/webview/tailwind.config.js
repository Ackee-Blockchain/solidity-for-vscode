// tailwind.config.js
module.exports = {
    purge: {
      enabled: !process.env.ROLLUP_WATCH,
      content: ['./public/index.html', './src/**/*.svelte'],
      options: {
        defaultExtractor: content => [
          ...(content.match(/[^<>"'`\s]*[^<>"'`\s:]/g) || []),
          ...(content.match(/(?<=class:)[^=>\/\s]*/g) || []),
        ],
      },
    },
    darkMode: 'media', // or 'media' or 'class'
    theme: {
      extend: {
        backgroundColor: {
            vscodeForeground: 'var(--vscode-editor-foreground)',
            vscodeBackground: 'var(--vscode-editor-background)',
            vscodeInputForeground: 'var(--vscode-input-foreground)',
            vscodeInputBackground: 'var(--vscode-input-background)',
            darkBackground: 'var(--vscode-editorWidget-background)',
            vscodeButtonPrimary: 'var(--button-primary-background);',
            vscodeButtonSecondary: 'var(--button-secondary-background);',

        },
        colors: {
            vscodeForeground: 'var(--vscode-editor-foreground)',
            vscodeBackground: 'var(--vscode-editor-background)',
            vscodeInputForeground: 'var(--vscode-input-foreground)',
            vscodeInputBackground: 'var(--vscode-input-background)',
            vscodeBorder: 'var(--vscode-editorWidget-border)',
            vscodeError: 'var(--vscode-editorError-foreground)',
            vscodeButtonPrimary: 'var(--button-primary-background);',
            vscodeButtonSecondary: 'var(---vscode-button-secondaryForeground);',
            vscodeWarning: 'var(--vscode-editorWarning-foreground)',
            vscodeWidgetBorder: 'var(--vscode-widget-border)'
        },
        borderRadius: {
            vscodeRounded: 'var(--corner-radius-round)',
        }
      },
    },
    variants: {
      extend: {},
    },
    plugins: [],
  }