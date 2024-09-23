import { StateId, TxHistoryState, TxOutput } from '../webview/shared/types';
import { BaseState } from './BaseState';

export class TxHistoryState extends BaseState<TxHistoryState[]> {
    private static _instance: TxHistoryState;

    private constructor() {
        super(StateId.TxHistory, []);
    }

    public static getInstance(): TxHistoryState {
        if (!this._instance) {
            this._instance = new TxHistoryState();
        }
        return this._instance;
    }

    public addTx(tx: TxHistoryState) {
        const _state = [...this.state, tx];
        this.state = _state;
    }
}
