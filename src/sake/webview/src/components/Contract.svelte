<script lang="ts">
    import ContractFunction from './ContractFunction.svelte';
    import ExpandButton from './icons/ExpandButton.svelte';
    import DeleteButton from './icons/DeleteButton.svelte';
    import { type AbiFunctionFragment, type DeployedContract } from '../../shared/types';
    import { removeDeployedContract, requestLabel, setLabel } from '../helpers/api';
    import CalldataBytes from './CalldataBytes.svelte';
    import CopyableSpan from './CopyableSpan.svelte';
    import ClickableSpan from './ClickableSpan.svelte';

    export let contract: DeployedContract;
    export let onFunctionCall: (
        calldata: string,
        contractAddress: string,
        func: AbiFunctionFragment
    ) => void;
    let expanded = true;
    $: filteredAbi = contract.abi.filter(
        (func: any) => func.type == 'function'
    ) as AbiFunctionFragment[];

    const _onFunctionCall = (calldata: string, func: AbiFunctionFragment) => {
        onFunctionCall(calldata, contract.address, func);
    };
</script>

<div class="flex flex-col gap-1">
    <div class="flex flex-row gap-1">
        <ExpandButton bind:expanded />
        <div class="flex-1 overflow-x-hidden rounded ps-2 bg-vscodeInputBackground flex flex-col">
            <!-- svelte-ignore a11y-click-events-have-key-events -->
            <div class="w-full flex flex-row gap-1 items-center justify-between">
                <!-- svelte-ignore a11y-click-events-have-key-events -->
                <ClickableSpan callback={() => requestLabel(contract.address)}>
                    {contract.label ? `${contract.label} (${contract.name})` : contract.name}
                </ClickableSpan>
                <DeleteButton callback={() => removeDeployedContract(contract.address)} />
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
