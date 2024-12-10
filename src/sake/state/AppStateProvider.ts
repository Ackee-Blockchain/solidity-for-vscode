import { State } from 'vscode-languageclient';
import { SakeContext } from '../context';
import { StateId, AppState } from '../webview/shared/types';
import BaseStateProvider from './BaseStateProvider';

export const appState = {
    state: {
        isAnvilInstalled: undefined,
        isWakeServerRunning: undefined,
        isOpenWorkspace: undefined,
        initializationState: undefined
    } as AppState,
    subscribers: [] as (() => void)[],

    get() {
        return this.state;
    },

    set(state: AppState) {
        this.state = state;
        this.notifyUpdate();
    },

    setLazy(partialState: Partial<AppState>) {
        this.state = {
            ...this.state,
            ...partialState
        };
        this.notifyUpdate();
    },

    notifyUpdate() {
        this.subscribers.forEach((callback) => callback());
    },

    subscribe(callback: () => void): () => void {
        this.subscribers.push(callback);
        return () => {
            this.subscribers = this.subscribers.filter((cb) => cb !== callback);
        };
    }
};

export default appState;

// export default class AppStateProvider extends BaseStateProvider<AppState> {
//     private static _instance: AppStateProvider;

//     private constructor() {
//         super(StateId.App, {
//             isAnvilInstalled: undefined,
//             isWakeServerRunning: undefined,
//             isOpenWorkspace: undefined,
//             initializationState: undefined
//         });

//         const _client = SakeContext.getInstance().client;
//         if (!_client) {
//             throw new Error('Client not set');
//         }

//         _client.onDidChangeState((state) => {
//             if (state.newState === State.Running) {
//                 this.setIsWakeServerRunning(true);
//                 return;
//             }
//             this.setIsWakeServerRunning(false);
//         });

//         this.setIsWakeServerRunning(_client.state === State.Running);
//     }

//     public static getInstance(): AppStateProvider {
//         if (!this._instance) {
//             this._instance = new AppStateProvider();
//         }
//         return this._instance;
//     }

//     public setIsAnvilInstalled(isAnvilInstalled: boolean) {
//         this.state = {
//             ...this._state,
//             isAnvilInstalled: isAnvilInstalled
//         };
//     }

//     public setIsWakeServerRunning(isWakeServerRunning: boolean) {
//         this.state = {
//             ...this._state,
//             isWakeServerRunning
//         };
//     }

//     public setInitializationState(initializationState: 'initializing' | 'loadingChains' | 'ready') {
//         this.state = {
//             ...this._state,
//             initializationState: initializationState
//         };
//     }

//     public setIsOpenWorkspace(isOpenWorkspace: 'open' | 'closed' | 'tooManyWorkspaces') {
//         this.state = {
//             ...this._state,
//             isOpenWorkspace: isOpenWorkspace
//         };
//     }
// }
