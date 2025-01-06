import type {
    CallRequest,
    DeploymentRequest,
    GetBytecodeRequest,
    NetworkCreationConfiguration,
    SetAccountBalanceRequest,
    SetAccountLabelRequest
} from './network_types';
import type { Address, StateId, WakeSetLabelResponse } from './types';

export interface BaseWebviewMessageRequest {
    requestId?: string;
}

export interface BaseWebviewMessageResponse {
    requestId?: string;
}

export enum WebviewMessageId {
    // webview -> extension
    requestState = 'requestState', // request any state from the backend
    showInfo = 'showInfo',
    showError = 'showError',
    getTextFromInputBox = 'getTextFromInputBox',
    copyToClipboard = 'copyToClipboard',
    compile = 'compile',
    deploy = 'deploy',
    contractFunctionCall = 'contractFunctionCall',
    undeployContract = 'undeployContract', // TODO rename
    setBalance = 'setBalance',
    setLabel = 'setLabel',
    navigate = 'navigate',
    openExternal = 'openExternal',
    openDeploymentInBrowser = 'openDeploymentInBrowser',
    getBytecode = 'getBytecode',
    requestNewProvider = 'requestNewProvider', // TODO remove
    restartWakeServer = 'restartWakeServer',
    openSettings = 'openSettings',
    openChainsQuickPick = 'openChainsQuickPick',
    openAddAbiQuickPick = 'openAddAbiQuickPick',
    removeProxy = 'removeProxy',
    requestAddDeployedContract = 'requestAddDeployedContract',
    toggleAutosave = 'toggleAutosave',
    saveState = 'saveState',
    deleteStateSave = 'deleteStateSave',

    // connection
    reconnectChain = 'reconnectChain',
    ping = 'ping',

    // chain manager
    createNewLocalChain = 'createNewLocalChain',
    connectToLocalChain = 'connectToLocalChain',

    // extension -> webview
    onGetState = 'onGetState',
    onSignal = 'onSignal'
}

export type SpecificWebviewMessageResponse<T extends WebviewMessageId> = {
    command: T;
} & BaseWebviewMessageResponse;

export type SpecificWebviewMessageRequest<T extends WebviewMessageId> = {
    command: T;
} & BaseWebviewMessageRequest;

export type WebviewMessageRequest =
    // | ({
    //       command: WebviewMessageId.getState;
    //       payload: StateId;
    //   } & BaseWebviewMessageRequest)
    | ({
          command: WebviewMessageId.requestState;
          payload: StateId;
      } & BaseWebviewMessageRequest)
    | ({
          command: WebviewMessageId.showInfo;
          payload: string;
      } & BaseWebviewMessageRequest)
    | ({
          command: WebviewMessageId.showError;
          payload: string;
      } & BaseWebviewMessageRequest)
    | ({
          command: WebviewMessageId.getTextFromInputBox;
          payload: {
              value: string;
              title?: string;
          };
      } & BaseWebviewMessageRequest)
    | ({
          command: WebviewMessageId.copyToClipboard;
          payload?: string;
      } & BaseWebviewMessageRequest)
    | ({
          command: WebviewMessageId.compile;
          payload: undefined;
      } & BaseWebviewMessageRequest)
    | ({
          command: WebviewMessageId.deploy;
          payload: DeploymentRequest;
      } & BaseWebviewMessageRequest)
    | ({
          command: WebviewMessageId.contractFunctionCall;
          payload: CallRequest;
      } & BaseWebviewMessageRequest)
    | ({
          command: WebviewMessageId.undeployContract;
          payload: Address;
      } & BaseWebviewMessageRequest)
    | ({
          command: WebviewMessageId.setBalance;
          payload: SetAccountBalanceRequest;
      } & BaseWebviewMessageRequest)
    | ({
          command: WebviewMessageId.setLabel;
          payload: SetAccountLabelRequest;
      } & BaseWebviewMessageRequest)
    | ({
          command: WebviewMessageId.navigate;
          payload: {
              path: string;
              startOffset?: number;
              endOffset?: number;
          };
      } & BaseWebviewMessageRequest)
    | ({
          command: WebviewMessageId.openExternal;
          payload: {
              path: string;
          };
      } & BaseWebviewMessageRequest)
    | ({
          command: WebviewMessageId.openDeploymentInBrowser;
          payload: any; // TODO
      } & BaseWebviewMessageRequest)
    | ({
          command: WebviewMessageId.getBytecode;
          payload: GetBytecodeRequest;
      } & BaseWebviewMessageRequest)
    | ({
          command: WebviewMessageId.requestNewProvider;
          payload: undefined;
      } & BaseWebviewMessageRequest)
    | ({
          command: WebviewMessageId.restartWakeServer;
          payload: undefined;
      } & BaseWebviewMessageRequest)
    | ({
          command: WebviewMessageId.openSettings;
          payload: string;
      } & BaseWebviewMessageRequest)
    | ({
          command: WebviewMessageId.openChainsQuickPick;
          payload: undefined;
      } & BaseWebviewMessageRequest)
    | ({
          command: WebviewMessageId.ping;
          payload: undefined;
      } & BaseWebviewMessageRequest)
    | ({
          command: WebviewMessageId.reconnectChain;
          payload: undefined;
      } & BaseWebviewMessageRequest)
    | ({
          command: WebviewMessageId.createNewLocalChain;
          payload: {
              displayName: string;
              networkCreationConfig?: NetworkCreationConfiguration;
              onlySuccessful?: boolean;
          };
      } & BaseWebviewMessageRequest)
    | ({
          command: WebviewMessageId.connectToLocalChain;
          payload: {
              displayName: string;
              uri: string;
              onlySuccessful: boolean;
          };
      } & BaseWebviewMessageRequest)
    | ({
          command: WebviewMessageId.openAddAbiQuickPick;
          payload: {
              contractAddress: Address;
          };
      } & BaseWebviewMessageRequest)
    | ({
          command: WebviewMessageId.removeProxy;
          payload: {
              contractAddress: Address;
              proxyId: string;
          };
      } & BaseWebviewMessageRequest)
    | ({
          command: WebviewMessageId.requestAddDeployedContract;
          payload: undefined;
      } & BaseWebviewMessageRequest)
    | ({
          command: WebviewMessageId.toggleAutosave;
          payload: undefined;
      } & BaseWebviewMessageRequest)
    | ({
          command: WebviewMessageId.saveState;
          payload: undefined;
      } & BaseWebviewMessageRequest)
    | ({
          command: WebviewMessageId.deleteStateSave;
          payload: undefined;
      } & BaseWebviewMessageRequest);

export type WebviewMessageResponse =
    | ({
          command: WebviewMessageId.onGetState;
          payload: any;
          stateId: StateId;
      } & BaseWebviewMessageResponse)
    | ({
          command: WebviewMessageId.requestState;
          payload: {
              success: boolean;
          };
      } & BaseWebviewMessageResponse)
    | ({
          command: WebviewMessageId.getBytecode;
          payload: {
              bytecode?: string;
          };
      } & BaseWebviewMessageResponse)
    | ({
          command: WebviewMessageId.getTextFromInputBox;
          payload: {
              value?: string;
          };
      } & BaseWebviewMessageResponse)
    | ({
          command: WebviewMessageId.restartWakeServer;
          payload: {
              success: boolean;
          };
      } & BaseWebviewMessageResponse)
    | ({
          command: WebviewMessageId.compile;
          payload: {
              success: boolean;
          };
      } & BaseWebviewMessageResponse)
    | ({
          command: WebviewMessageId.ping;
          payload: {
              success: boolean;
          };
      } & BaseWebviewMessageResponse)
    | ({
          command: WebviewMessageId.reconnectChain;
          payload: {
              success: boolean;
          };
      } & BaseWebviewMessageResponse)
    | ({
          command: WebviewMessageId.createNewLocalChain;
          payload: {
              success: boolean;
          };
      } & BaseWebviewMessageResponse)
    | ({
          command: WebviewMessageId.connectToLocalChain;
          payload: {
              success: boolean;
          };
      } & BaseWebviewMessageResponse)
    | ({
          command: WebviewMessageId.onSignal;
          payload: any;
          signalId: SignalId;
      } & BaseWebviewMessageResponse);

export type WebviewMessageResponsePayload<T extends WebviewMessageId> =
    T extends WebviewMessageResponse['command']
        ? Extract<WebviewMessageResponse, { command: T }>['payload']
        : never;

export enum SignalId {
    showAdvancedLocalChainSetup = 'showAdvancedLocalChainSetup',
    showNotification = 'showNotification'
}

// export type WebviewMessageRequest<T extends keyof WebviewMessageRequestPayload> = {
//     command: T;
//     payload: WebviewMessageRequestPayload[T];
// } & BaseWebviewMessageRequest;

// export type WebviewMessageRequestPayload = {
//     [WebviewMessageId.getState]: any;
//     [WebviewMessageId.getTextFromInputBox]: {
//         value: string;
//         title?: string;
//     };
//     [WebviewMessageId.copyToClipboard]: undefined;
//     [WebviewMessageId.onCompile]: undefined;
//     [WebviewMessageId.onDeploy]: DeploymentRequest;
//     [WebviewMessageId.onContractFunctionCall]: CallRequest;
//     [WebviewMessageId.onUndeployContract]: Address;
//     [WebviewMessageId.onSetBalance]: SetAccountBalanceRequest;
//     [WebviewMessageId.onSetLabel]: SetAccountLabelRequest;
//     [WebviewMessageId.onNavigate]: {
//         path: string;
//         startOffset?: number;
//         endOffset?: number;
//     };
//     [WebviewMessageId.onOpenExternal]: {
//         path: string;
//     };
//     [WebviewMessageId.onOpenDeploymentInBrowser]: any;
//     [WebviewMessageId.onGetBytecode]: GetBytecodeRequest;
// };

// export type WebviewMessageResponse<T extends keyof WebviewMessageResponsePayload> = {
//     command: T;
//     payload: WebviewMessageResponsePayload[T];
// } & BaseWebviewMessageResponse;

// export type WebviewMessageResponsePayload = {
//     [WebviewMessageId.getState]: any;
//     [WebviewMessageId.onGetBytecode]: {
//         bytecode?: string;
//     };
//     [WebviewMessageId.getTextFromInputBox]: {
//         value: string;
//     };
// };
