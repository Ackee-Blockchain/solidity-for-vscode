import { AccountStateData, StateId } from "../webview/shared/types";
import { BaseState } from "./BaseState";

export class AccountState extends BaseState<AccountStateData> {
    private static _instance: AccountState;

    private constructor() {
        super(StateId.Accounts, []);
    }

    public static getInstance(): AccountState {
        if (!this._instance) {
            this._instance = new AccountState();
        }
        return this._instance;
    }

    public setAccounts(accounts: AccountStateData) {
        // TODO validate payload
        this.state = accounts;
    }

    // TODO, add balances etc... maybe diff between account state data and wake acc state data response
}