import { Account, AccountState, StateId } from '../webview/shared/types';
import { BaseStateProvider } from './BaseStateProvider';

export class AccountStateProvider extends BaseStateProvider<Account[]> {
    constructor() {
        super(StateId.Accounts, []);
    }

    public add(account: Account) {
        this.state = [...this.state, account];
    }

    public includes(address: string): boolean {
        return this.state.some((a) => a.address === address);
    }

    public remove(address: string) {
        this.state = this.state.filter((a) => a.address !== address);
    }

    public setBalance(address: string, balance: number) {
        this.state = this.state.map((a) => {
            if (a.address === address) {
                a.balance = balance;
            }
            return a;
        });
    }

    public setNickname(address: string, nickname: string) {
        this.state = this.state.map((a) => {
            if (a.address === address) {
                a.nick = nickname;
            }
            return a;
        });
    }

    public setAccounts(accounts: Account[]) {
        // TODO validate payload
        this.state = accounts;
    }
    /**
     * Set accounts without emitting an update event to webviews
     * @dev used in getAccounts (which calls getBalances, which will emit an update event)
     *
     * @param accounts state to set
     */
    public setAccountsSilent(accounts: Account[]) {
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
