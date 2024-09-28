import type { AbiFunctionFragment } from 'web3-types';
import type { WakeCallRequestParams } from './wake_types';

export interface WebviewMessageData {
    command: string;
    payload: any;
    requestId?: string;
    stateId?: string;
}

// TODO should be STATE_ID but me no likey for some reason
// TODO add messages as enums
export enum WebviewMessage {
    onInfo = 'onInfo',
    onError = 'onError',
    getTextFromInputBox = 'getTextFromInputBox',
    copyToClipboard = 'copyToClipboard',
    setState = 'setState',
    getState = 'getState',
    onCompile = 'onCompile',
    onDeploy = 'onDeploy',
    onContractFunctionCall = 'onContractFunctionCall',
    onUndeployContract = 'onUndeployContract', // TODO rename
    onGetAccounts = 'onGetAccounts',
    onGetBalances = 'onGetBalances', // @ todo rename, probably dony use 'on' everywhere
    onSetBalances = 'onSetBalances',
    onsetLabel = 'onsetLabel',
    onNavigate = 'onNavigate',
    onOpenExternal = 'onOpenExternal',
    onOpenDeploymentInBrowser = 'onOpenDeploymentInBrowser',
    onGetBytecode = 'onGetBytecode'
}

// TODO move to a separate networks state types

export interface CallRequest {
    func: AbiFunctionFragment;
    requestParams: WakeCallRequestParams;
}

export interface DeploymentRequest {}
