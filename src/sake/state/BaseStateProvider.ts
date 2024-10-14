import * as vscode from 'vscode';
import { BaseWebviewProvider } from '../providers/BaseWebviewProvider';
import { StateId, WebviewMessageId } from '../webview/shared/types';

export abstract class BaseStateProvider<T> {
    subscriptions: BaseWebviewProvider[] = [];
    _state: T;

    protected constructor(private readonly _stateId: StateId, initialState: T) {
        this._state = initialState;
    }

    public subscribe(provider: BaseWebviewProvider) {
        if (!this.subscriptions.includes(provider)) {
            this.subscriptions.push(provider);
            provider.setSubscribedState(this);
        }
    }

    public unsubscribe(provider: BaseWebviewProvider) {
        if (this.subscriptions.includes(provider)) {
            this.subscriptions = this.subscriptions.filter((p) => p !== provider);
            provider.unsetSubscribedState(this);
        }
    }

    public get stateId(): StateId {
        return this._stateId;
    }

    public get state(): T {
        return this._state;
    }

    public set state(_state: T) {
        // TODO check if state is the same, only update if it differs
        this._state = _state;
        this._sendUpdateMessage();
    }

    private _sendUpdateMessage() {
        // console.log('sending update message', this._stateId, this._state);
        this.subscriptions.forEach((provider) => {
            provider.postMessageToWebview({
                command: WebviewMessageId.getState,
                payload: this._state,
                stateId: this._stateId
            });
        });
    }

    public sendToWebview() {
        this._sendUpdateMessage();
    }
}
