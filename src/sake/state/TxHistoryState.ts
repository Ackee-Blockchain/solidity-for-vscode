import { StateId, TxHistoryStateData, TxOutput } from "../webview/shared/types";
import { BaseState } from "./BaseState";

export class TxHistoryState extends BaseState<TxHistoryStateData[]> {
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

    public addTx(tx: TxHistoryStateData) {
        const _state = [...this.state, tx];
        this.state = _state;
    }
}