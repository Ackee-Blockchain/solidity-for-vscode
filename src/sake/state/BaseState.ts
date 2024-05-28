import * as vscode from 'vscode';
import { BaseWebviewProvider } from '../providers/BaseWebviewProvider';
import { StateId } from '../webview/shared/types';

export abstract class BaseState<T> {
    subscriptions: BaseWebviewProvider[] = [];
    _state: T;

    protected constructor(private readonly _stateId: StateId, initialState: T) {
        this._state = initialState;
    }
    public subscribe(provider: BaseWebviewProvider) {
        this.subscriptions.push(provider);
        provider.setSubscribedState(this);
    }

    public get stateId(): StateId {
        return this._stateId;
    }

    public get state(): T {
        return this._state;
    }

    public set state(_state: T) {
        this._state = _state;
        this._sendUpdateMessage();
    }

    private _sendUpdateMessage() {
        this.subscriptions.forEach((provider) => {
            provider.postMessageToWebview({
                command: "stateUpdated",
                payload: this._state,
                stateId: this._stateId
            });
        });
    }
}

/*
* The state has
* deployedcontracts, txhistory, compiler
*/