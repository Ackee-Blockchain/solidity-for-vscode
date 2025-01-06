import { GenericHook } from "../../utils/hook";

export interface ExtensionState {
    currentChainId?: string;
}

export const extensionState = new GenericHook<ExtensionState>({
    currentChainId: undefined
});