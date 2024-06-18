/*
 *
 * Account and Contract Interfaces
 *
 */

export type Address = string;

export interface Account {
    address: string;
    balance: number;
}

// inherited from Fragment
export interface ContractFunction {
    // required
    inputs: Array<ContractFunctionInput>;
    stateMutability: string;
    type: string;

    // optional
    outputs: Array<any> | undefined; // TODO
    name: string;
    // displayName: string | undefined;
}

export type ContractAbi = Array<ContractFunction>;

export interface Contract extends Account {
    name: string;
    abi: ContractAbi;
}

// TODO rename to json interface (AbiFunctionFragment from web-eth-abi)
export interface ContractFunctionInput {
    // required
    internalType: string;
    name: string;
    type: string;

    // optional
    components: Array<ContractFunctionInput> | undefined;
}

/*
 *
 * Messaging
 *
 */

export interface WebviewMessageData {
    command: string;
    payload: any;
    requestId?: string;
    stateId?: string;
}

// TODO resolve how svelte can import enums
// TODO should be STATE_ID but me no likey for some reason
// TODO add messages as enums
export enum WebviewMessage {
    onInfo = 'onInfo',
    onError = 'onError',
    getTextFromInputBox = 'getTextFromInputBox',
    setState = 'setState',
    getState = 'getState',
    onCompile = 'onCompile',
    onDeploy = 'onDeploy',
    onContractFunctionCall = 'onContractFunctionCall',
    onUndeployContract = 'onUndeployContract', // TODO rename
    onGetAccounts = 'onGetAccounts',
    onGetBalances = 'onGetBalances', // @ todo rename, probably dony use on everywhere
    onSetBalances = 'onSetBalances'
}

// TODO create pairs of WebviewMessage and WebviewInput and WebviewOutput

/*
 *
 * Payloads
 *
 */

export interface CompiledContract {
    fqn: string;
    name: string;
    abi: ContractAbi;
    // TODO join this type with contract
}

export interface FunctionCallPayload {
    func: ContractFunction;
    requestParams: WakeFunctionCallRequestParams;
}

/*
 *
 * Tx Outputs
 *
 */

export enum TxType {
    Deployment = 'Deployment',
    FunctionCall = 'Function Call'
}

export interface TxOutput {
    type: TxType;
    success: boolean;
    from: string;
    // to: string;
    // returnValue: string;
    receipt: TxReceipt;
    callTrace: string;
    // TODO remove to and returnValue and use TxDeploymentOutput and TxFunctionCallOutput
    // also add input data and function name for ease of use in history
}

export interface TxDeploymentOutput extends TxOutput {
    contractName: string;
    contractAddress: string | null;
}

export interface TxFunctionCallOutput extends TxOutput {
    to: string;
    functionName: string;
    returnValue: any | undefined; // TOTO create a type for this
}

/*
 *
 * State
 *
 */

// TODO remove this
export interface DeploymentStateData {
    name: string;
    address: string;
    abi: any;
}

export interface CompilationStateData {
    contracts: Array<CompiledContract>;
    dirty: boolean;
    // TODO add isDirty
}

export type AccountStateData = {
    address: string;
    balance: number | undefined;
};

export type TxHistoryStateData = TxDeploymentOutput | TxFunctionCallOutput;

export enum StateId {
    DeployedContracts = 'deployedContracts',
    CompiledContracts = 'compiledContracts',
    Accounts = 'accounts',
    TxHistory = 'txHistory'
}

/*
 *
 * API to Wake
 *
 */

export interface WakeCompiledContract {
    [key: string]: ContractAbi;
}

export interface TxReceipt {
    [key: string]: any;
}

export interface WakeCompilationResponse {
    contracts: WakeCompiledContract;
    success: boolean;
    // TODO add error message
}

export interface WakeDeployedContract {
    type: string;
    status: string;
    cumulativeGasUsed: string;
    logs: any[];
    logsBloom: string;
    transactionHash: string;
    transactionIndex: string;
    blockHash: string;
    blockNumber: string;
    gasUsed: string;
    effectiveGasPrice: string;
    from: string;
    to: string | null;
    contractAddress: string;
    root: string;
}

// export type WakeDeploymentResponse = WakeDeployedContract;
export interface WakeDeploymentResponse {
    success: boolean;
    contractAddress: string | null;
    txReceipt: TxReceipt;
    callTrace: string;
}

export interface WakeDeploymentRequestParams {
    contract_fqn: string;
    sender: string;
    calldata: string;
    value: number;
}

export type WakeGetAccountsResponse = AccountStateData;

export interface WakeFunctionCallRequestParams {
    contract_address: string;
    sender: string;
    calldata: string;
    value: number;
}

export interface WakeFunctionCallResponse {
    success: boolean;
    returnValue: string; // might need to change to hex string
    txReceipt: TxReceipt;
    callTrace: string;
}

export interface WakeGetBalancesRequestParams {
    addresses: string[];
}

export interface WakeGetBalancesResponse {
    success: boolean;
    balances: { [key: string]: number };
}

export interface WakeSetBalancesRequestParams {
    balances: { [key: string]: number };
}

export interface WakeSetBalancesResponse {
    success: boolean;
}
