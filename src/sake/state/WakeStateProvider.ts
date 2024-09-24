import { StateId, WakeState } from '../webview/shared/types';
import { BaseStateProvider } from './BaseStateProvider';

export class WakeStateProvider extends BaseStateProvider<WakeState> {
    private static _instance: WakeStateProvider;

    private constructor() {
        super(StateId.Wake, {
            isAnvilInstalled: undefined,
            isServerRunning: undefined
        });
    }

    public static getInstance(): WakeStateProvider {
        if (!this._instance) {
            this._instance = new WakeStateProvider();
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
