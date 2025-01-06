import { SakeContext } from '../context';
import { Hook } from '../utils/hook';
import { AppState } from '../webview/shared/types';

export const appState = new Hook<AppState>({
    isAnvilInstalled: undefined,
    isWakeServerRunning: undefined,
    isOpenWorkspace: undefined,
    initializationState: undefined
});

export default appState;
