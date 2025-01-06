import * as vscode from 'vscode';
import { OutputViewManager } from '../../providers/OutputTreeProvider';
import {
    CallOperation,
    TransactionHistoryState,
    TransactionResult
} from '../../webview/shared/types';
import { GenericHook } from '../../utils/hook';

export class TransactionHistoryStateProvider extends GenericHook<TransactionHistoryState> {
    private output: OutputViewManager;

    constructor() {
        super([]);
        this.output = OutputViewManager.getInstance();
    }

    public add(tx: TransactionResult) {
        this.set([...this.get(), tx]);
    }

    public async show() {
        if (this.get().length === 0) {
            vscode.window.showInformationMessage('No transaction history available');
            return;
        }

        const history = this.get();
        const quickPickItems = history.map((transaction) => {
            if (transaction.type === CallOperation.Deployment) {
                return {
                    label: 'Deployed ' + transaction.contractName,
                    // description: transaction.type,
                    detail: '$(rocket) ' + transaction.contractAddress,
                    tx: transaction
                };
            }
            return {
                label: 'Called ' + transaction.functionName,
                // description: transaction.type,
                detail: '$(indent) ' + transaction.to,
                tx: transaction
            };
        });

        // reverse the order of the transactions
        quickPickItems.reverse();

        // Wait for the user to pick an item
        const pick = await vscode.window.showQuickPick(quickPickItems);

        if (!pick) {
            return;
        }

        // Show the pick in the output tree
        this.output.set(pick.tx);
        vscode.commands.executeCommand('sake-output.focus');
    }
}
