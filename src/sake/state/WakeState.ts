import { StateId, WakeStateData } from '../webview/shared/types';
import { BaseState } from './BaseState';

export class WakeState extends BaseState<WakeStateData> {
    private static _instance: WakeState;

    private constructor() {
        super(StateId.Wake, {
            isAnvilInstalled: undefined,
            isServerRunning: undefined,
            isOpenWorkspace: undefined
        });
    }

    public static getInstance(): WakeState {
        if (!this._instance) {
            this._instance = new WakeState();
        }
        return this._instance;
    }

    public setIsAnvilInstalled(isAnvilInstalled: boolean) {
        console.log('setIsAnvilInstalled', isAnvilInstalled);
        this.state = {
            ...this._state,
            isAnvilInstalled: isAnvilInstalled
        };
    }

    public setIsServerRunning(isServerRunning: boolean) {
        console.log('setIsServerRunning', isServerRunning);
        this.state = {
            ...this._state,
            isServerRunning: isServerRunning
        };
    }

    public setIsOpenWorkspace(isOpenWorkspace: 'open' | 'closed' | 'tooManyWorkspaces') {
        console.log('setIsOpenWorkspace', isOpenWorkspace);
        this.state = {
            ...this._state,
            isOpenWorkspace: isOpenWorkspace
        };
    }
}
