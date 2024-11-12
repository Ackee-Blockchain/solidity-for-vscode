<script lang="ts">
    import ContractFunction from './ContractFunction.svelte';
    import ExpandButton from './icons/ExpandButton.svelte';
    import DeleteButton from './icons/DeleteButton.svelte';
    import {
        DeployedContractType,
        type AbiFunctionFragment,
        type DeployedContract
    } from '../../shared/types';
    import {
        removeDeployedContract,
        requestLabel,
        setLabel,
        openAddAbiQuickPick
    } from '../helpers/api';
    import CalldataBytes from './CalldataBytes.svelte';
    import CopyableSpan from './CopyableSpan.svelte';
    import ClickableSpan from './ClickableSpan.svelte';
    import WarningIcon from './icons/WarningIcon.svelte';
    import DefaultButton from './icons/DefaultButton.svelte';
    import AbiIcon from './icons/AbiIcon.svelte';
    import RadioTowerIcon from './icons/RadioTowerIcon.svelte';

    export let contract: DeployedContract;
    export let onFunctionCall: (
        calldata: string,
        contractAddress: string,
        func: AbiFunctionFragment
    ) => void;
    let expanded = true;
    let expandedProxy = false;
    $: filteredAbi = contract.abi.filter(
        (func: any) => func.type == 'function'
    ) as AbiFunctionFragment[];
    $: filteredProxies =
        contract.type === DeployedContractType.Compiled
            ? contract.extendedAbi?.map(
                  (proxy) =>
                      proxy.filter((func: any) => func.type == 'function') as AbiFunctionFragment[]
              )
            : [];
    $: console.log('updated contract', contract);

    const _onFunctionCall = (calldata: string, func: AbiFunctionFragment) => {
        onFunctionCall(calldata, contract.address, func);
    };

    $: console.log('contract', contract);
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
                <div class="flex fex-row pr-1">
                    <DeleteButton callback={() => removeDeployedContract(contract.address)} />

                    <!--
                        could use radio-tower or bracket-dot-->
                    {#if contract.type === DeployedContractType.Compiled}
                        <DefaultButton callback={() => openAddAbiQuickPick(contract.fqn)}>
                            <RadioTowerIcon />
                        </DefaultButton>
                    {/if}
                </div>
            </div>

            {#if expanded}
                <div class="w-full flex flex-row gap-1 items-center justify-between pb-1">
                    <span class="text-sm"
                        >{contract.type === DeployedContractType.Compiled
                            ? 'Deployed to'
                            : 'Fetched from'}
                        <CopyableSpan text={contract.address} className="truncate text-sm" />
                    </span>
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

                <CalldataBytes onFunctionCall={_onFunctionCall} />

                {#if filteredProxies}
                    <ClickableSpan
                        callback={() => (expandedProxy = !expandedProxy)}
                        className="flex flex-row gap-1 items-center ml-2"
                    >
                        {#if expandedProxy}
                            <!-- chevron down from codicons -->
                            <svg
                                width="16"
                                height="16"
                                viewBox="0 0 16 16"
                                xmlns="http://www.w3.org/2000/svg"
                                fill="currentColor"
                                class=""
                                ><path
                                    fill-rule="evenodd"
                                    clip-rule="evenodd"
                                    d="M7.976 10.072l4.357-4.357.62.618L8.284 11h-.618L3 6.333l.619-.618 4.357 4.357z"
                                /></svg
                            >
                        {:else}
                            <!-- chevron right from codicons -->
                            <svg
                                width="16"
                                height="16"
                                viewBox="0 0 16 16"
                                xmlns="http://www.w3.org/2000/svg"
                                fill="currentColor"
                                class=""
                                ><path
                                    fill-rule="evenodd"
                                    clip-rule="evenodd"
                                    d="M10.072 8.024L5.715 3.667l.618-.62L11 7.716v.618pmL6.333 13l-.618-.619 4.357-4.357z"
                                /></svg
                            >
                        {/if}
                        <span class="text-sm">Custom Added ABI</span>
                    </ClickableSpan>
                    {#if expandedProxy}
                        {#each filteredProxies as proxy}
                            {#each proxy as proxy_func}
                                <ContractFunction
                                    func={proxy_func}
                                    onFunctionCall={_onFunctionCall}
                                />
                            {/each}
                        {/each}
                    {/if}
                {/if}
            </div>
        {/if}
    {/if}
</div>
