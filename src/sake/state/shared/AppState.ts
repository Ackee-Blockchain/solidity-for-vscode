import { AppState } from '../../webview/shared/types';
import { GenericHook } from '../../utils/hook';

export const appState = new GenericHook<AppState>({
    isAnvilInstalled: undefined,
    isWakeServerRunning: undefined,
    isOpenWorkspace: undefined,
    initializationState: undefined
});

export default appState;
