import {
    WakeCompilationResponse,
    WakeDeploymentRequestParams,
    WakeDeploymentResponse,
    WakeCallResponse,
    WakeGetBalancesRequestParams,
    WakeGetBalancesResponse,
    WakeSetBalancesRequestParams,
    WakeSetBalancesResponse,
    WakeGetAccountsResponse,
    WakeSetLabelRequestParams,
    WakeSetLabelResponse,
    CallType,
    AbiFunctionFragment,
    WakeCallRequestParams,
    WakeTransactRequestParams,
    WakeTransactResponse,
    WakeGetBytecodeRequestParams,
    WakeGetBytecodeResponse,
    WakeCreateChainResponse,
    WakeCreateChainRequestParams,
    WakeConnectChainRequestParams,
    WakeConnectChainResponse,
    WakeDisconnectChainRequestParams,
    WakeDisconnectChainResponse,
    WakeGetAccountsRequestParams
} from '../webview/shared/types';
import { LanguageClient } from 'vscode-languageclient/node';
import { validate } from '../utils/validate';
import { SharedChainStateProvider } from '../state/SharedChainStateProvider';
import { SakeContext } from '../context';

const sharedChainState = SharedChainStateProvider.getInstance();

/*
 * Get accounts and balances and save to state
 *
 * @param client
 * @returns boolean based on success
 */

export class WakeError extends Error {}
export class WakeApiError extends WakeError {}
export class WakeAnvilNotFoundError extends WakeError {}

export class WakeApi {
    private static _instance: WakeApi;

    private static get _client(): LanguageClient {
        return SakeContext.getInstance().client;
    }

    static async createChain(
        requestParams: WakeCreateChainRequestParams
    ): Promise<WakeCreateChainResponse> {
        try {
            const result = await WakeApi.sendWakeRequest<WakeCreateChainResponse>(
                'wake/sake/createChain',
                requestParams
            );

            if (result == null) {
                throw new Error('No result returned');
            }

            return {
                ...result,
                // @dev hotfix lower all addresses
                accounts: result.accounts.map((address) => address.toLowerCase())
            };
        } catch (e) {
            throw new WakeApiError(
                `Failed to create chain: ${e instanceof Error ? e.message : String(e)}`
            );
        }
    }

    static async connectChain(
        requestParams: WakeConnectChainRequestParams
    ): Promise<WakeConnectChainResponse> {
        try {
            const result = await this.sendWakeRequest<WakeConnectChainResponse>(
                'wake/sake/connectChain',
                requestParams
            );

            if (result == null) {
                throw new Error('No result returned');
            }

            return {
                ...result,
                // @dev hotfix lower all addresses
                accounts: result.accounts.map((address) => address.toLowerCase())
            };
        } catch (e) {
            throw new WakeApiError(
                `Failed to connect chain: ${e instanceof Error ? e.message : String(e)}`
            );
        }
    }

    static async disconnectChain(
        requestParams: WakeDisconnectChainRequestParams
    ): Promise<WakeDisconnectChainResponse> {
        try {
            console.log('disconnectChain', requestParams);
            const result = await this.sendWakeRequest<WakeDisconnectChainResponse>(
                'wake/sake/disconnectChain',
                requestParams
            );

            console.log('disconnectChain result', result);

            if (result == null) {
                throw new Error('No result returned');
            }

            return result;
        } catch (e) {
            throw new WakeApiError(
                `Failed to disconnect chain: ${e instanceof Error ? e.message : String(e)}`
            );
        }
    }

    static async getAccounts(
        requestParams: WakeGetAccountsRequestParams
    ): Promise<WakeGetAccountsResponse> {
        try {
            const result = await this.sendWakeRequest<WakeGetAccountsResponse>(
                'wake/sake/getAccounts',
                requestParams
            );

            if (result == null) {
                throw new Error('No result returned');
            }

            if (result.length === 0) {
                throw new Error('No accounts returned');
            }

            // @dev hotfix lower all addresses
            const addresses = result.map((address) => address.toLowerCase());

            return addresses;
        } catch (e) {
            throw new WakeApiError(
                `Failed to get balances: ${e instanceof Error ? e.message : String(e)}`
            );
        }
    }

    static async getBalances(
        requestParams: WakeGetBalancesRequestParams
    ): Promise<WakeGetBalancesResponse> {
        try {
            const result = await this.sendWakeRequest<WakeGetBalancesResponse>(
                'wake/sake/getBalances',
                requestParams
            );

            if (result == null) {
                throw new Error('No result returned');
            }

            // @dev hotfix lower all addresses
            const balances = Object.fromEntries(
                Object.entries(result.balances).map(([address, balance]) => [
                    address.toLowerCase(),
                    balance
                ])
            );

            return {
                ...result,
                balances
            };
        } catch (e) {
            throw new WakeApiError(`[Wake API] ${e instanceof Error ? e.message : String(e)}`);
        }
    }

    static async setBalances(
        requestParams: WakeSetBalancesRequestParams
    ): Promise<WakeSetBalancesResponse> {
        try {
            const result = await WakeApi.sendWakeRequest<WakeSetBalancesResponse>(
                'wake/sake/setBalances',
                requestParams
            );

            if (result == null) {
                throw new Error('No result returned');
            }

            if (!result.success) {
                throw new Error('Failed to set balances');
            }

            return result;
        } catch (e) {
            throw new WakeApiError(`[Wake API] ${e instanceof Error ? e.message : String(e)}`);
        }
    }

    static async setLabel(requestParams: WakeSetLabelRequestParams): Promise<WakeSetLabelResponse> {
        try {
            const result = await WakeApi.sendWakeRequest<WakeSetLabelResponse>(
                'wake/sake/setLabel',
                requestParams
            );

            if (result == null) {
                throw new Error('No result returned');
            }

            if (!result.success) {
                throw new Error('Failed to set label');
            }

            return result;
        } catch (e) {
            throw new WakeApiError(`[Wake API] ${e instanceof Error ? e.message : String(e)}`);
        }
    }

    static async compile(): Promise<WakeCompilationResponse> {
        try {
            const result = await WakeApi.sendWakeRequest<WakeCompilationResponse>(
                'wake/sake/compile',
                undefined,
                false
            );

            if (result == null) {
                throw new WakeApiError('No result returned');
            }

            return result;
        } catch (e) {
            throw new WakeApiError(
                `Failed to compile: ${e instanceof Error ? e.message : String(e)}`
            );
        }
    }

    static async getBytecode(
        requestParams: WakeGetBytecodeRequestParams
    ): Promise<WakeGetBytecodeResponse> {
        throw new Error('Not implemented'); // TODO add to wake first
        // try {
        //     const result = await this.sendWakeRequest<WakeGetBytecodeResponse>(
        //         'wake/sake/getBytecode',
        //         requestParams
        //     );

        //     if (result == null) {
        //         throw new Error('No result returned');
        //     }

        //     return result;
        // } catch (e) {
        //     throw new WakeApiError(
        //         `Failed to get bytecode: ${e instanceof Error ? e.message : String(e)}`
        //     );
        // }
    }

    static async deploy(
        requestParams: WakeDeploymentRequestParams
    ): Promise<WakeDeploymentResponse> {
        try {
            const result = await WakeApi.sendWakeRequest<WakeDeploymentResponse>(
                'wake/sake/deploy',
                requestParams
            );

            if (result == null) {
                throw new Error('No result returned');
            }

            return result;
        } catch (e) {
            throw new WakeApiError(
                `Failed to deploy: ${e instanceof Error ? e.message : String(e)}`
            );
        }
    }

    static async call(requestParams: WakeCallRequestParams): Promise<WakeCallResponse> {
        try {
            const result = await WakeApi.sendWakeRequest<WakeCallResponse>(
                'wake/sake/call',
                requestParams
            );

            if (result == null) {
                throw new Error('No result returned');
            }

            return result;
        } catch (e) {
            throw new WakeApiError(`Failed to call: ${e instanceof Error ? e.message : String(e)}`);
        }
    }

    static async transact(requestParams: WakeTransactRequestParams): Promise<WakeTransactResponse> {
        try {
            const result = await WakeApi.sendWakeRequest<WakeTransactResponse>(
                'wake/sake/transact',
                requestParams
            );

            if (result == null) {
                throw new Error('No result returned');
            }

            return result;
        } catch (e) {
            throw new WakeApiError(
                `Failed to transact: ${e instanceof Error ? e.message : String(e)}`
            );
        }
    }

    static async ping(): Promise<boolean> {
        try {
            const result = await WakeApi.sendWakeRequest<boolean>('wake/sake/ping');
            return result;
        } catch (e) {
            throw new WakeApiError(`Failed to ping: ${e instanceof Error ? e.message : String(e)}`);
        }
    }

    private static async sendWakeRequest<T>(
        method: string,
        params?: any,
        validateResponse: boolean = true
    ): Promise<T> {
        if (WakeApi._client == null) {
            throw new WakeApiError('Client not initialized');
        }
        try {
            const response = await WakeApi._client.sendRequest<T>(method, params);
            sharedChainState.setIsAnvilInstalled(true);
            return validateResponse ? validate(response) : response;
        } catch (e) {
            console.error('Error sending Wake Request', e);
            const message = typeof e === 'string' ? e : (e as Error).message;
            if (message == 'Anvil executable not found') {
                sharedChainState.setIsAnvilInstalled(false);
            }
            throw new WakeApiError(message);
        }
    }
}

function specifyCallType(func: AbiFunctionFragment): CallType {
    return func.stateMutability === 'view' || func.stateMutability === 'pure'
        ? CallType.Call
        : CallType.Transact;
}

// /*
//  * Get balances for a list of addresses and save to state
//  * @dev only updates existing accounts state
//  *
//  * @param requestParams - list of addresses
//  * @param client - language client
//  * @returns boolean based on success
//  */
// export async function getBalances(
//     requestParams: WakeGetBalancesRequestParams,
//     client: LanguageClient | undefined
// ) {
//     try {
//         let result = await sendWakeRequest<WakeGetBalancesResponse>(
//             client,
//             'wake/sake/getBalances',
//             requestParams
//         );

//         // const _accountState = requestParams.addresses.map((address) => {
//         //     return {
//         //         address: address,
//         //         balance: result.balances[address]
//         //     };
//         // });
//         // accountState.setAccounts(_accountState);

//         accountState.updateBalances(result.balances);

//         return true;
//     } catch (e) {
//         const message = typeof e === 'string' ? e : (e as Error).message;
//         vscode.window.showErrorMessage('Failed to get addresses: ' + message);
//         return false;
//     }
// }

// export async function setBalances(
//     requestParams: WakeSetBalancesRequestParams,
//     client: LanguageClient | undefined
// ) {
//     try {
//         let result = await sendWakeRequest<WakeSetBalancesResponse>(
//             client,
//             'wake/sake/setBalances',
//             requestParams
//         );

//         result = validate(result);

//         if (result == null) {
//             throw new Error('No result returned');
//         }
//         if (!result.success) {
//             throw new Error('Failed to set balances');
//         }

//         // Update balances
//         accountState.updateBalances(requestParams.balances);
//     } catch (e) {
//         const message = typeof e === 'string' ? e : (e as Error).message;
//         vscode.window.showErrorMessage('Failed to set balances: ' + message);
//         return false;
//     }
// }

// export async function compile(client: LanguageClient | undefined) {
//     try {
//         let result = await sendWakeRequest<WakeCompilationResponse>(client, 'wake/sake/compile');

//         if (result == null) {
//             throw new Error('No result returned');
//         }
//         if (!result.success) {
//             throw new Error('Compilation was unsuccessful');
//         }

//         // vscode.window.showInformationMessage('Compilation was successful!');
//         const parsedContracts = parseCompiledContracts(result.contracts);
//         const parsedErrors = parseCompilationIssues(result.errors);
//         const parsedSkipped = parseCompilationSkipped(result.skipped);
//         compilationState.set(parsedContracts, [...parsedErrors, ...parsedSkipped]);

//         return result.success;
//     } catch (e) {
//         const message = typeof e === 'string' ? e : (e as Error).message;
//         vscode.window.showErrorMessage('Compilation failed with error: ' + message);
//         return false;
//     }
// }

// export async function deploy(
//     requestParams: WakeDeploymentRequestParams,
//     client: LanguageClient | undefined,
//     output: OutputViewManager
// ) {
//     try {
//         let result = await sendWakeRequest<WakeDeploymentResponse>(
//             client,
//             'wake/sake/deploy',
//             requestParams
//         );

//         result = validate(result);

//         if (result == null) {
//             throw new Error('No result returned');
//         }

//         let _contractCompilationData;
//         if (result.success) {
//             _contractCompilationData = compilationState.getContract(requestParams.contractFqn);
//             if (_contractCompilationData == null) {
//                 throw new Error(
//                     'Contract compilation data not found for fqn: ' + requestParams.contractFqn
//                 );
//             }
//             const _deploymentData: DeploymentState = {
//                 name: _contractCompilationData.name,
//                 address: result.contractAddress!,
//                 abi: _contractCompilationData.abi,
//                 balance: null,
//                 nick: null
//             };

//             deploymentState.deploy(_deploymentData);

//             // update calldata
//         }

//         // Add to tx history
//         const txOutput: TxDeploymentOutput = {
//             type: TxType.Deployment,
//             success: result.success, // TODO success will show true even on revert
//             from: requestParams.sender,
//             contractAddress: result.contractAddress,
//             contractName: getNameFromContractFqn(requestParams.contractFqn),
//             receipt: result.txReceipt,
//             callTrace: result.callTrace
//         };

//         TransactionHistoryState.addTx(txOutput);
//         output.set(txOutput);
//         vscode.commands.executeCommand('sake-output.focus');

//         // vscode.window.showInformationMessage('Deployment was successful!');

//         return true;
//     } catch (e) {
//         const message = typeof e === 'string' ? e : (e as Error).message;
//         vscode.window.showErrorMessage('Deployment failed with error: ' + message);
//         return false;
//     }
// }

// export async function call(
//     CallRequest: CallRequest,
//     client: LanguageClient | undefined,
//     output: OutputViewManager
// ) {
//     const { requestParams, func } = CallRequest;

//     const callType = specifyCallType(func);

//     try {
//         const apiEndpoint =
//             callType === CallType.Transact ? 'wake/sake/transact' : 'wake/sake/call';
//         let result = await sendWakeRequest<WakeCallResponse>(client, apiEndpoint, requestParams);

//         result = validate(result);

//         if (result == null) {
//             throw new Error('No result returned');
//         }
//         // if (!result.success) { throw new Error("Function call was unsuccessful"); }

//         let decodedReturnValue: TxDecodedReturnValue[] | undefined = undefined;
//         if (result.success) {
//             // parse result
//             try {
//                 decodedReturnValue = decodeCallReturnValue(result.returnValue, func);
//             } catch (e) {
//                 vscode.window.showErrorMessage('Failed to decode return value: ' + e);
//             }
//         }

//         const txOutput: TxCallOutput = {
//             callType: callType,
//             type: TxType.FunctionCall,
//             success: result.success, // TODO success will show true even on revert
//             from: requestParams.sender,
//             to: requestParams.contractAddress,
//             functionName: func.name,
//             returnData: {
//                 bytes: result.returnValue,
//                 decoded: decodedReturnValue
//             },
//             receipt: result.txReceipt,
//             callTrace: result.callTrace
//         };

//         TransactionHistoryState.addTx(txOutput);
//         output.set(txOutput);
//         vscode.commands.executeCommand('sake-output.focus');

//         // vscode.window.showInformationMessage("Function call was successful!");

//         return true;
//     } catch (e) {
//         const message = typeof e === 'string' ? e : (e as Error).message;
//         vscode.window.showErrorMessage(
//             'Function call failed with error received from LSP server: ' + message
//         );
//         return false;
//     }
// }

// export async function setLabel(
//     requestParams: WakeSetLabelRequestParams,
//     client: LanguageClient | undefined
// ) {
//     try {
//         sendWakeRequest<WakeSetBalancesResponse>(client, 'wake/sake/setLabel', requestParams);
//     } catch (e) {
//         const message = typeof e === 'string' ? e : (e as Error).message;
//         vscode.window.showErrorMessage('Failed to set balances: ' + message);
//         return false;
//     }
// }

// export async function getBytecode(
//     requestParams: WakeGetBytecodeRequestParams,
//     client: LanguageClient | undefined
// ) {
//     try {
//         return await sendWakeRequest<WakeGetBytecodeResponse>(
//             client,
//             'wake/sake/getBytecode',
//             requestParams
//         );
//     } catch (e) {
//         const message = typeof e === 'string' ? e : (e as Error).message;
//         vscode.window.showErrorMessage('Failed to get bytecode: ' + message);
//         return false;
//     }
// }

// function specifyCallType(func: ContractFunction): CallType {
//     return func.stateMutability === 'view' || func.stateMutability === 'pure'
//         ? CallType.Call
//         : CallType.Transact;
// }

// }
