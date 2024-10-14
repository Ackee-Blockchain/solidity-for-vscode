// import { StateId, SharedChainState } from '../webview/shared/types';
// import { BaseStateProvider } from './BaseStateProvider';

// export class SharedChainStateProvider extends BaseStateProvider<SharedChainState> {
//     private static _instance: SharedChainStateProvider;

//     private constructor() {
//         super(StateId.Wake, {
//             isAnvilInstalled: undefined,
//             isWakeServerRunning: undefined
//         });
//     }

//     public static getInstance(): SharedChainStateProvider {
//         if (!this._instance) {
//             this._instance = new SharedChainStateProvider();
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
//             isWakeServerRunning: isWakeServerRunning
//         };
//     }
// }
