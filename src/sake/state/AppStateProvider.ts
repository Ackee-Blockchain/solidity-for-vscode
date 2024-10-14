import { StateId, AppState } from '../webview/shared/types';
import { BaseStateProvider } from './BaseStateProvider';

export class AppStateProvider extends BaseStateProvider<AppState> {
    private static _instance: AppStateProvider;

    private constructor() {
        super(StateId.App, {
            isAnvilInstalled: undefined,
            isWakeServerRunning: undefined,
            isOpenWorkspace: undefined,
            isInitialized: undefined
        });
    }

    public static getInstance(): AppStateProvider {
        if (!this._instance) {
            this._instance = new AppStateProvider();
        }
        return this._instance;
    }

    public setIsAnvilInstalled(isAnvilInstalled: boolean) {
        this.state = {
            ...this._state,
            isAnvilInstalled: isAnvilInstalled
        };
    }

    public setIsWakeServerRunning(isWakeServerRunning: boolean) {
        this.state = {
            ...this._state,
            isWakeServerRunning: isWakeServerRunning
        };
    }

    public setIsInitialized(isInitialized: boolean) {
        this.state = {
            ...this._state,
            isInitialized: isInitialized
        };
    }

    public setIsOpenWorkspace(isOpenWorkspace: 'open' | 'closed' | 'tooManyWorkspaces') {
        this.state = {
            ...this._state,
            isOpenWorkspace: isOpenWorkspace
        };
    }
}
