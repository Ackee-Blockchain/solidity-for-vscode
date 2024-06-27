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
    import { copyToClipboard, removeContract, setContractNick } from '../helpers/api';
    import CalldataBytes from './CalldataBytes.svelte';
    import { filter } from '@renovatebot/pep440';
    import CopyableSpan from './CopyableSpan.svelte';
    import ClickableSpan from './ClickableSpan.svelte';

    provideVSCodeDesignSystem().register(vsCodeButton(), vsCodeTextField());

    export let contract: DeploymentStateData;
    export let onFunctionCall: (
        calldata: string,
        contract_address: string,
        func: ContractFunctionType
    ) => void;
    let expanded = false;
    $: filteredAbi = contract.abi.filter((func: any) => func.type == 'function');

    const _onFunctionCall = (calldata: string, func: ContractFunctionType) => {
        onFunctionCall(calldata, contract.address, func);
    };
</script>

<div class="flex flex-col gap-1">
    <div class="flex flex-row gap-1">
        <ExpandButton bind:expanded />
        <div class="flex-1 overflow-x-hidden rounded ps-2 bg-vscodeInputBackground flex flex-col">
            <!-- svelte-ignore a11y-click-events-have-key-events -->
            <div
                class="w-full flex flex-row gap-1 items-center justify-between"
                class:cursor-pointer={!expanded}
                on:click={() => {
                    if (!expanded) {
                        expanded = true;
                    }
                }}
            >
                <!-- svelte-ignore a11y-click-events-have-key-events -->
                <ClickableSpan callback={() => setContractNick(contract)}>
                    {contract.nick ? `${contract.nick} (${contract.name})` : contract.name}
                </ClickableSpan>
                <DeleteButton
                    callback={() => {
                        removeContract(contract);
                    }}
                />
            </div>

            {#if expanded}
                <div class="w-full flex flex-row gap-1 items-center justify-between pb-1">
                    <CopyableSpan text={contract.address} className="truncate text-sm" />
                    <!-- <span class="truncate text-sm">{contract.address}</span> -->
                    <!-- <CopyButton callback={() => copyToClipboard(contract.address)} /> -->
                </div>
                <!-- todo -->
                <!-- <div class="flex flex-row gap-1 items-center">
                    <span class="text-sm">100 Ξ</span>
                </div> -->
            {/if}
        </div>
    </div>
    {#if expanded}
        {#if filteredAbi.length > 0}
            <div class="flex flex-col gap-1">
                {#each filteredAbi as func}
                    <ContractFunction {func} onFunctionCall={_onFunctionCall} />
                {/each}
            </div>
        {/if}
        <CalldataBytes onFunctionCall={_onFunctionCall} />
    {/if}
</div>
