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
    WakeGetAccountsRequestParams,
    WakeDumpStateRequestParams,
    WakeDumpStateResponse,
    WakeLoadStateResponse,
    WakeLoadStateRequestParams,
    WakeGetAbiResponse,
    WakeGetAbiWithProxyResponse,
    WakeGetAbiRequestParams,
    WakeGetAbiWithProxyRequestParams
} from '../webview/shared/types';
import { validate } from '../utils/validate';
import { SakeContext } from '../context';
import { chainRegistry } from '../state/ChainRegistry';
import appState from '../state/AppStateProvider';

export class WakeError extends Error {}
export class WakeApiError extends WakeError {}
export class WakeAnvilNotFoundError extends WakeError {}

async function sendWakeRequest<T>(
    method: string,
    params?: any,
    validateResponse: boolean = true
): Promise<T> {
    const client = SakeContext.getInstance().client;
    if (client == null) {
        throw new WakeApiError('Client not initialized');
    }
    try {
        const response = await client.sendRequest<T>(method, params);
        appState.setLazy({
            isAnvilInstalled: true
        });
        return validateResponse ? validate(response) : response;
    } catch (e) {
        const message = typeof e === 'string' ? e : (e as Error).message;
        if (message == 'Anvil executable not found') {
            appState.setLazy({
                isAnvilInstalled: false
            });
        }
        if (message == 'Client is not running') {
            appState.setLazy({
                isWakeServerRunning: false
            });
        }
        // local wake instance
        if (message == 'Chain instance not connected') {
            chainRegistry.getHook(params.sessionId)?.setLazy({
                connected: false
            });
        }
        // anvil instance which was connected to
        if (message == 'Connection to remote host was lost.') {
            chainRegistry.getHook(params.sessionId)?.setLazy({
                connected: false
            });
        }
        throw new WakeApiError(message);
    }
}

export async function createChain(
    requestParams: WakeCreateChainRequestParams
): Promise<WakeCreateChainResponse> {
    try {
        const result = await sendWakeRequest<WakeCreateChainResponse>(
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

export async function connectChain(
    requestParams: WakeConnectChainRequestParams
): Promise<WakeConnectChainResponse> {
    try {
        const result = await sendWakeRequest<WakeConnectChainResponse>(
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

export async function disconnectChain(
    requestParams: WakeDisconnectChainRequestParams
): Promise<WakeDisconnectChainResponse> {
    try {
        const result = await sendWakeRequest<WakeDisconnectChainResponse>(
            'wake/sake/disconnectChain',
            requestParams
        );

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

export async function getAccounts(
    requestParams: WakeGetAccountsRequestParams
): Promise<WakeGetAccountsResponse> {
    try {
        const result = await sendWakeRequest<WakeGetAccountsResponse>(
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

export async function getBalances(
    requestParams: WakeGetBalancesRequestParams
): Promise<WakeGetBalancesResponse> {
    try {
        const result = await sendWakeRequest<WakeGetBalancesResponse>(
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

export async function setBalances(
    requestParams: WakeSetBalancesRequestParams
): Promise<WakeSetBalancesResponse> {
    try {
        const result = await sendWakeRequest<WakeSetBalancesResponse>(
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

export async function setLabel(
    requestParams: WakeSetLabelRequestParams
): Promise<WakeSetLabelResponse> {
    try {
        const result = await sendWakeRequest<WakeSetLabelResponse>(
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

export async function compile(): Promise<WakeCompilationResponse> {
    try {
        const result = await sendWakeRequest<WakeCompilationResponse>(
            'wake/sake/compile',
            undefined,
            false
        );

        if (result == null) {
            throw new WakeApiError('No result returned');
        }

        return result;
    } catch (e) {
        throw new WakeApiError(`Failed to compile: ${e instanceof Error ? e.message : String(e)}`);
    }
}

export async function getBytecode(
    requestParams: WakeGetBytecodeRequestParams
): Promise<WakeGetBytecodeResponse> {
    throw new Error('Not implemented'); // TODO add to wake first
}

export async function deploy(
    requestParams: WakeDeploymentRequestParams
): Promise<WakeDeploymentResponse> {
    try {
        const result = await sendWakeRequest<WakeDeploymentResponse>(
            'wake/sake/deploy',
            requestParams
        );

        if (result == null) {
            throw new Error('No result returned');
        }

        return result;
    } catch (e) {
        throw new WakeApiError(`Failed to deploy: ${e instanceof Error ? e.message : String(e)}`);
    }
}

export async function call(requestParams: WakeCallRequestParams): Promise<WakeCallResponse> {
    try {
        const result = await sendWakeRequest<WakeCallResponse>('wake/sake/call', requestParams);

        if (result == null) {
            throw new Error('No result returned');
        }

        return result;
    } catch (e) {
        throw new WakeApiError(`Failed to call: ${e instanceof Error ? e.message : String(e)}`);
    }
}

export async function transact(
    requestParams: WakeTransactRequestParams
): Promise<WakeTransactResponse> {
    try {
        const result = await sendWakeRequest<WakeTransactResponse>(
            'wake/sake/transact',
            requestParams
        );

        if (result == null) {
            throw new Error('No result returned');
        }

        return result;
    } catch (e) {
        throw new WakeApiError(`Failed to transact: ${e instanceof Error ? e.message : String(e)}`);
    }
}

export async function ping(): Promise<boolean> {
    try {
        const result = await sendWakeRequest<boolean>('wake/sake/ping');
        return result;
    } catch (e) {
        throw new WakeApiError(`Failed to ping: ${e instanceof Error ? e.message : String(e)}`);
    }
}

export async function dumpState(
    requestParams: WakeDumpStateRequestParams
): Promise<WakeDumpStateResponse> {
    try {
        const result = await sendWakeRequest<WakeDumpStateResponse>(
            'wake/sake/dumpState',
            requestParams
        );

        if (result == null) {
            throw new Error('No result returned');
        }

        return result;
    } catch (e) {
        throw new WakeApiError(
            `Failed to dump state: ${e instanceof Error ? e.message : String(e)}`
        );
    }
}

export async function loadState(
    requestParams: WakeLoadStateRequestParams
): Promise<WakeLoadStateResponse> {
    try {
        const result = await sendWakeRequest<WakeLoadStateResponse>(
            'wake/sake/loadState',
            requestParams
        );

        if (result == null) {
            throw new Error('No result returned');
        }

        return result;
    } catch (e) {
        throw new WakeApiError(
            `Failed to load state: ${e instanceof Error ? e.message : String(e)}`
        );
    }
}

export async function getAbi(requestParams: WakeGetAbiRequestParams): Promise<WakeGetAbiResponse> {
    try {
        const result = await sendWakeRequest<WakeGetAbiResponse>('wake/sake/getAbi', requestParams);

        if (result == null) {
            throw new Error('No result returned');
        }

        return result;
    } catch (e) {
        throw new WakeApiError(`Failed to get ABI: ${e instanceof Error ? e.message : String(e)}`);
    }
}

export async function getAbiWithProxy(
    requestParams: WakeGetAbiWithProxyRequestParams
): Promise<WakeGetAbiWithProxyResponse> {
    try {
        const result = await sendWakeRequest<WakeGetAbiWithProxyResponse>(
            'wake/sake/getAbiWithProxy',
            requestParams
        );

        if (result == null) {
            throw new Error('No result returned');
        }

        return result;
    } catch (e) {
        throw new WakeApiError(`Failed to get ABI: ${e instanceof Error ? e.message : String(e)}`);
    }
}

export function specifyCallType(func: AbiFunctionFragment): CallType {
    return func.stateMutability === 'view' || func.stateMutability === 'pure'
        ? CallType.Call
        : CallType.Transact;
}
