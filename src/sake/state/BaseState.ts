import * as vscode from 'vscode';
import { BaseWebviewProvider } from '../providers/BaseWebviewProvider';
import { StateId, WebviewMessage } from '../webview/shared/types';

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
        console.log("state in " + this._stateId + " changed, calling subscribers", this.state)
        this.subscriptions.forEach((provider) => {
            provider.postMessageToWebview({
                command: WebviewMessage.stateChanged,
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