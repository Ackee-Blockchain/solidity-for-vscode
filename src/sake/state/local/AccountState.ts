import { GenericHook } from '../../utils/hook';
import { Account, AccountState, Address, ExtendedAccount } from '../../webview/shared/types';

export class AccountStateProvider extends GenericHook<AccountState> {
    constructor() {
        super([]);
    }

    public add(account: ExtendedAccount) {
        if (this.includes(account.address)) {
            return;
        }
        this.set([...this.get(), account]);
    }

    public update(account: ExtendedAccount) {
        this.set(
            this.get().map((a) => {
                if (a.address === account.address) {
                    return account;
                }
                return a;
            })
        );
    }

    public getAccount(address: Address): ExtendedAccount | undefined {
        return this.get().find((a) => a.address === address);
    }

    public includes(address: Address): boolean {
        return this.get().some((a) => a.address === address);
    }

    public remove(address: Address) {
        this.set(this.get().filter((a) => a.address !== address));
    }

    public setBalance(address: Address, balance: number) {
        this.set(
            this.get().map((a) => {
                if (a.address === address) {
                    a.balance = balance;
                }
                return a;
            })
        );
    }

    public setLabel(address: Address, label?: string) {
        this.set(
            this.get().map((a) => {
                if (a.address === address) {
                    a.label = label;
                }
                return a;
            })
        );
    }

    public setAccounts(accounts: Account[]) {
        // TODO validate payload
        this.set(accounts);
    }

    public updateBalances(balances: { [key: string]: number }) {
        const _modifiedAccounts = Object.keys(balances);
        this.set(
            this.get().map((account) => {
                if (_modifiedAccounts.includes(account.address)) {
                    account.balance = balances[account.address];
                }
                return account;
            })
        );
    }
}