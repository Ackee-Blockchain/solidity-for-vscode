import { State } from 'vscode-languageclient';
import { SakeContext } from '../context';
import { StateId, AppState } from '../webview/shared/types';
import BaseStateProvider from './BaseStateProvider';
import { Hook } from '../utils/hook';

export const appState = new Hook<AppState>({
    isAnvilInstalled: undefined,
    isWakeServerRunning: undefined,
    isOpenWorkspace: undefined,
    initializationState: undefined
});

const _client = SakeContext.getInstance().client;

export default appState;
