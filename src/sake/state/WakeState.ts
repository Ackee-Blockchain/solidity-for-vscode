import { StateId, WakeStateData } from '../webview/shared/types';
import { BaseState } from './BaseState';

export class WakeState extends BaseState<WakeStateData> {
    private static _instance: WakeState;

    private constructor() {
        super(StateId.Wake, {
            isAnvilInstalled: undefined,
            isServerRunning: undefined
        });
    }

    public static getInstance(): WakeState {
        if (!this._instance) {
            this._instance = new WakeState();
        }
        return this._instance;
    }

    public setIsAnvilInstalled(isAnvilInstalled: boolean) {
        this.state = {
            ...this._state,
            isAnvilInstalled: isAnvilInstalled
        };
    }

    public setIsServerRunning(isServerRunning: boolean) {
        this.state = {
            ...this._state,
            isServerRunning: isServerRunning
        };
    }
}
