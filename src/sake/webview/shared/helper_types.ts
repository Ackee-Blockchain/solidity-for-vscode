import type { QuickInputButton, QuickPickItem, QuickPick } from 'vscode';

export interface SakeProviderQuickPickItem extends QuickPickItem {
    itemButtonClick?: (button: QuickInputButton) => void;
    providerId?: string;
}
