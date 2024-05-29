/*
*
* Account and Contract Interfaces
*
*/

export interface Account {
    address: string;
    balance: number;
}

export interface ContractFunction {
    // required
    inputs: Array<ContractFunctionInput>;
    stateMutability: string;
    type: string;

    // optional
    outputs: Array<any> | undefined; // TODO
    name: string | undefined;
}

export type ContractAbi = Array<ContractFunction>;

export interface Contract extends Account {
    name: string;
    abi: ContractAbi;
}

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
    onInfo = "onInfo",
    onError = "onError",
    getTextFromInputBox = "getTextFromInputBox",
    setState = "setState",
    getState = "getState",
    stateChanged = "stateChanged",
    onCompile = "onCompile",
    onDeploy = "onDeploy",
    onContractFunctionCall = "onContractFunctionCall",
    onUndeployContract = "onUndeployContract", // TODO rename
}

// TODO create pairs of WebviewMessage and WebviewInput and WebviewOutput

/*
*
* Payloads
*
*/

export interface WakeCompiledContract {
    [key: string]: any[];
}

export interface CompiledContract {
    fqn: string;
    name: string;
    abi: ContractAbi;
    // TODO join this type with contract
}

export interface WakeCompilationResult {
    contracts: WakeCompiledContract;
    success: boolean;
    // TODO add error message
}

export interface WakeDeploymentResult {
}

export interface FunctionCallPayload {
    contract: Contract;
    function: string;
    arguments: string;
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

export enum StateId {
    DeployedContracts = "deployedContracts",
    CompiledContracts = "compiledContracts",
}