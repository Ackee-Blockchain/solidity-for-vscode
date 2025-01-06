import * as vscode from 'vscode';
import { OutputViewManager } from '../providers/OutputTreeProvider';
import {
    CallOperation,
    StateId,
    TransactionHistoryState,
    TransactionResult
} from '../webview/shared/types';
import BaseStateProvider from './BaseStateProvider';

export default class TransactionHistoryStateProvider extends BaseStateProvider<TransactionHistoryState> {
    private output: OutputViewManager;

    constructor() {
        super(StateId.TransactionHistory, []);
        this.output = OutputViewManager.getInstance();
    }

    public add(tx: TransactionResult) {
        const _state = [...this.state, tx];
        this.state = _state;
    }

    public async show() {
        if (this.state.length === 0) {
            vscode.window.showInformationMessage('No transaction history available');
            return;
        }

        const history = this.state;
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
