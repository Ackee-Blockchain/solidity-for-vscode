import type {
    CallRequest,
    DeploymentRequest,
    GetBytecodeRequest,
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
    // TODO consider removing in favor of specific getters
    getState = 'getState', // getter for any state
    requestState = 'requestState', // request any state from the backend
    onInfo = 'onInfo',
    onError = 'onError',
    getTextFromInputBox = 'getTextFromInputBox',
    copyToClipboard = 'copyToClipboard',
    onCompile = 'onCompile',
    onDeploy = 'onDeploy',
    onContractFunctionCall = 'onContractFunctionCall',
    onUndeployContract = 'onUndeployContract', // TODO rename
    onSetBalance = 'onSetBalance',
    onSetLabel = 'onSetLabel',
    onNavigate = 'onNavigate',
    onOpenExternal = 'onOpenExternal',
    onOpenDeploymentInBrowser = 'onOpenDeploymentInBrowser',
    onGetBytecode = 'onGetBytecode',
    onrequestNewProvider = 'onrequestNewProvider',
    onRestartWakeServer = 'onRestartWakeServer',
    onSelectChain = 'onSelectChain',
    onOpenSettings = 'onOpenSettings',
    onOpenChainsQuickPick = 'onOpenChainsQuickPick'
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
          command: WebviewMessageId.onInfo;
          payload: string;
      } & BaseWebviewMessageRequest)
    | ({
          command: WebviewMessageId.onError;
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
          command: WebviewMessageId.onCompile;
          payload: undefined;
      } & BaseWebviewMessageRequest)
    | ({
          command: WebviewMessageId.onDeploy;
          payload: DeploymentRequest;
      } & BaseWebviewMessageRequest)
    | ({
          command: WebviewMessageId.onContractFunctionCall;
          payload: CallRequest;
      } & BaseWebviewMessageRequest)
    | ({
          command: WebviewMessageId.onUndeployContract;
          payload: Address;
      } & BaseWebviewMessageRequest)
    | ({
          command: WebviewMessageId.onSetBalance;
          payload: SetAccountBalanceRequest;
      } & BaseWebviewMessageRequest)
    | ({
          command: WebviewMessageId.onSetLabel;
          payload: SetAccountLabelRequest;
      } & BaseWebviewMessageRequest)
    | ({
          command: WebviewMessageId.onNavigate;
          payload: {
              path: string;
              startOffset?: number;
              endOffset?: number;
          };
      } & BaseWebviewMessageRequest)
    | ({
          command: WebviewMessageId.onOpenExternal;
          payload: {
              path: string;
          };
      } & BaseWebviewMessageRequest)
    | ({
          command: WebviewMessageId.onOpenDeploymentInBrowser;
          payload: any; // TODO
      } & BaseWebviewMessageRequest)
    | ({
          command: WebviewMessageId.onGetBytecode;
          payload: GetBytecodeRequest;
      } & BaseWebviewMessageRequest)
    | ({
          command: WebviewMessageId.onrequestNewProvider;
          payload: undefined;
      } & BaseWebviewMessageRequest)
    | ({
          command: WebviewMessageId.onRestartWakeServer;
          payload: undefined;
      } & BaseWebviewMessageRequest)
    | ({
          command: WebviewMessageId.onSelectChain;
          payload: undefined;
      } & BaseWebviewMessageRequest)
    | ({
          command: WebviewMessageId.onOpenSettings;
          payload: string;
      } & BaseWebviewMessageRequest)
    | ({
          command: WebviewMessageId.onOpenChainsQuickPick;
          payload: undefined;
      } & BaseWebviewMessageRequest);

export type WebviewMessageResponse =
    | ({
          command: WebviewMessageId.getState;
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
          command: WebviewMessageId.onGetBytecode;
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
          command: WebviewMessageId.onRestartWakeServer;
          payload: {
              success: boolean;
          };
      } & BaseWebviewMessageResponse)
    | ({
          command: WebviewMessageId.onCompile;
          payload: {
              success: boolean;
          };
      } & BaseWebviewMessageResponse);

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
