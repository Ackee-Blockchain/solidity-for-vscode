import { StateId, TransactionHistoryState, TxOutput } from '../webview/shared/types';
import { BaseStateProvider } from './BaseStateProvider';

export class TransactionHistoryStateProvider extends BaseStateProvider<TransactionHistoryState[]> {
    constructor() {
        super(StateId.TransactionHistory, []);
    }

    public addTx(tx: TransactionHistoryState) {
        const _state = [...this.state, tx];
        this.state = _state;
    }
}
