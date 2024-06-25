<script lang="ts">
    import {
        provideVSCodeDesignSystem,
        vsCodeTextField,
        vsCodeButton
    } from '@vscode/webview-ui-toolkit';
    import ContractFunction from './ContractFunction.svelte';
    import IconButton from './IconButton.svelte';
    import ExpandButton from './icons/ExpandButton.svelte';
    import DeleteButton from './icons/DeleteButton.svelte';
    import CopyButton from './icons/CopyButton.svelte';
    import {
        WebviewMessage,
        type Contract,
        type WakeFunctionCallRequestParams,
        type ContractFunction as ContractFunctionType,
        type DeploymentStateData
    } from '../../shared/types';
    import { messageHandler } from '@estruyf/vscode/dist/client';
    import { copyToClipboard, removeContract } from '../helpers/api';
    import CalldataBytes from './CalldataBytes.svelte';

    provideVSCodeDesignSystem().register(vsCodeButton(), vsCodeTextField());

    export let contract: DeploymentStateData;
    export let onFunctionCall: (
        calldata: string,
        contract_address: string,
        func: ContractFunctionType
    ) => void;
    let expanded = false;

    const _onFunctionCall = (calldata: string, func: ContractFunctionType) => {
        onFunctionCall(calldata, contract.address, func);
    };
</script>

<div class="flex flex-col gap-1">
    <div class="flex flex-row gap-1">
        <ExpandButton bind:expanded />
        <div class="flex-1 overflow-x-hidden rounded px-2 bg-vscodeInputBackground flex flex-col">
            <div class="w-full flex flex-row gap-1 items-center justify-between">
                <p>{contract.name}</p>
                <DeleteButton
                    callback={() => {
                        removeContract(contract);
                    }}
                />
            </div>

            {#if expanded}
                <div class="w-full flex flex-row gap-1 items-center justify-between">
                    <span class="truncate text-sm">{contract.address}</span>
                    <CopyButton callback={() => copyToClipboard(contract.address)} />
                </div>
                <!-- todo -->
                <!-- <div class="flex flex-row gap-1 items-center">
                    <span class="text-sm">100 Ξ</span>
                </div> -->
            {/if}
        </div>
    </div>
    {#if expanded}
        {#if contract.abi.length > 0}
            <div class="flex flex-col gap-1">
                {#each contract.abi as func}
                    {#if func.type == 'function'}
                        <ContractFunction {func} onFunctionCall={_onFunctionCall} />
                    {/if}
                {/each}
            </div>
        {/if}
        <CalldataBytes onFunctionCall={_onFunctionCall} />
    {/if}
</div>
