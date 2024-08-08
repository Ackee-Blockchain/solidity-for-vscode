import { StateId, WakeStateData } from '../webview/shared/types';
import { BaseState } from './BaseState';

export class WakeState extends BaseState<WakeStateData> {
    private static _instance: WakeState;

    private constructor() {
        super(StateId.Wake, {
            isAnvilInstalled: undefined
        });
    }

    public static getInstance(): WakeState {
        if (!this._instance) {
            this._instance = new WakeState();
        }
        return this._instance;
    }

    public set(isAnvilInstalled: boolean) {
        this.state = {
            isAnvilInstalled: isAnvilInstalled
        };
    }
}
