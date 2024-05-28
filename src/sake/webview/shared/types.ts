/*
*
* Account and Contract Interfaces
*
*/

export interface Account {
    address: string;
    balance: number;
}

export interface Contract extends Account {
    name: string;
    abi: Array<ContractFunction>;
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

export interface WebviewMessage {
    command: string;
    payload: any;
    requestId?: string;
    stateId?: string;
}

// TODO resolve how svelte can import enums
// TODO should be STATE_ID but me no likey for some reason
// TODO add messages as enums
export enum Message {
    onInfo = "onInfo",
    onError = "onError",
    getTextFromInputBox = "getTextFromInputBox",
    setState = "setState",
    getState = "getState",
    onContractFunctionCall = "onContractFunctionCall",
    onDeployContract = "onDeployContract",
    onUndeployContract = "onUndeployContract", // TODO rename
}

/*
*
* Payloads
*
*/

export interface FunctionCallPayload {
    contract: Contract;
    function: string;
    arguments: string;
}

export interface DeployedContractState {
    name: string;
    address: string;
    abi: any;
}

export enum StateId {
    DeployedContracts = "deployedContracts",
}

interface ContractFunctionOutput {
    // TODO
}
