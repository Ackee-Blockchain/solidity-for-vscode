import type { QuickInputButton, QuickPickItem, QuickPick } from 'vscode';

export interface SakeProviderQuickPickItem extends QuickPickItem {
    itemButtonClick?: (
        button: QuickInputButton,
        quickPick: QuickPick<SakeProviderQuickPickItem>
    ) => void;
    providerId?: string;
}
