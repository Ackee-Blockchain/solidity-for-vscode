import { GenericHook } from '../../utils/hook';
import { ChainPreconfig } from '../../webview/shared/network_types';
export interface ExtensionState {
    currentChainId?: string;
    defaultPreconfigs: ChainPreconfig[];
}

export const extensionState = new GenericHook<ExtensionState>({
    currentChainId: undefined,
    defaultPreconfigs: []
});
