import { AccountStateData, StateId } from '../webview/shared/types';
import { BaseState } from './BaseState';

export class AccountState extends BaseState<AccountStateData[]> {
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

    public setAccounts(accounts: AccountStateData[]) {
        // TODO validate payload
        this.state = accounts;
    }

    /**
     * Set accounts without emitting an update event to webviews
     * @dev used in getAccounts (which calls getBalances, which will emit an update event)
     *
     * @param accounts state to set
     */
    public setAccountsSilent(accounts: AccountStateData[]) {
        this._state = accounts;
    }

    public updateBalances(balances: { [key: string]: number }) {
        const _modifiedAccounts = Object.keys(balances);
        this.state = this.state.map((account) => {
            if (_modifiedAccounts.includes(account.address)) {
                account.balance = balances[account.address];
            }
            return account;
        });
    }

    // TODO, add balances etc... maybe diff between account state data and wake acc state data response
}
