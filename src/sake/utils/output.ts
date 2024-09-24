import * as vscode from 'vscode';
import { TransactionHistoryState } from '../state/TransactionHistoryStateProvider';
import { SakeOutputTreeProvider } from '../providers/OutputTreeProvider';
import { TxDeploymentOutput, TxCallOutput, TxType } from '../webview/shared/types';

const TransactionHistoryState = TransactionHistoryState.getInstance();

export async function showTxFromHistory(outputTreeProvider: SakeOutputTreeProvider) {
    if (TransactionHistoryState.state.length === 0) {
        vscode.window.showInformationMessage('No transaction history available');
        return;
    }

    const history = TransactionHistoryState.state;
    const quickPickItems = history.map((_tx) => {
        switch (_tx.type) {
            case TxType.Deployment: {
                const tx = _tx as TxDeploymentOutput;
                return {
                    label: tx.contractName,
                    description: tx.type,
                    detail: '$(indent) ' + tx.contractAddress,
                    tx: tx
                };
            }
            case TxType.FunctionCall: {
                const tx = _tx as TxCallOutput;
                return {
                    label: tx.functionName,
                    description: tx.type,
                    // detail: "$(indent) " + tx.returnValue,
                    tx: tx
                };
            }
            default: {
                return {
                    label: 'Unknown',
                    description: 'Unknown',
                    detail: 'Unknown',
                    tx: _tx
                };
            }
        }
    });

    // reverse the order of the transactions
    quickPickItems.reverse();

    // Wait for the user to pick an item
    const pick = await vscode.window.showQuickPick(quickPickItems);

    if (!pick) {
        return;
    }

    // Show the pick in the output tree
    outputTreeProvider.set(pick.tx);
    vscode.commands.executeCommand('sake-output.focus');
}
