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
        openAddAbiQuickPick,
        removeProxy
    } from '../helpers/api';
    import CalldataBytes from './CalldataBytes.svelte';
    import CopyableSpan from './CopyableSpan.svelte';
    import ClickableSpan from './ClickableSpan.svelte';
    import WarningIcon from './icons/WarningIcon.svelte';
    import DefaultButton from './icons/DefaultButton.svelte';
    import AbiIcon from './icons/AbiIcon.svelte';
    import RadioTowerIcon from './icons/RadioTowerIcon.svelte';
    import RadioTowerCrossedIcon from './icons/RadioTowerCrossedIcon.svelte';

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

    // Proxies
    $: isProxy = contract.proxyFor && contract.proxyFor.length > 0;
    $: filteredProxies =
        contract.proxyFor?.map((proxy) => ({
            ...proxy,
            abi: proxy.abi.filter((func: any) => func.type == 'function') as AbiFunctionFragment[]
        })) ?? [];

    const _onFunctionCall = (calldata: string, func: AbiFunctionFragment) => {
        onFunctionCall(calldata, contract.address, func);
    };
</script>

<div class="flex flex-col gap-1 group">
    <div class="flex flex-row gap-1">
        <ExpandButton bind:expanded />
        <div class="flex-1 overflow-x-hidden rounded ps-2 bg-vscodeInputBackground flex flex-col">
            <!-- svelte-ignore a11y-click-events-have-key-events -->
            <div class="w-full flex flex-row gap-1 items-center justify-between">
                <!-- svelte-ignore a11y-click-events-have-key-events -->
                <ClickableSpan callback={() => requestLabel(contract.address)}>
                    {contract.label ? `${contract.label} (${contract.name})` : contract.name}
                </ClickableSpan>
                <div class="flex fex-row pr-1 opacity-0 group-hover:opacity-100">
                    {#if contract.type === DeployedContractType.Compiled}
                        {#if isProxy}
                            <!-- @dev currently only supports one proxy -->
                            <DefaultButton
                                callback={() =>
                                    removeProxy(contract.fqn, contract.proxyFor?.[0]?.address)}
                            >
                                <RadioTowerCrossedIcon />
                            </DefaultButton>
                        {:else}
                            <DefaultButton callback={() => openAddAbiQuickPick(contract.fqn)}>
                                <RadioTowerIcon />
                            </DefaultButton>
                        {/if}
                    {/if}

                    <DeleteButton callback={() => removeDeployedContract(contract.address)} />
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
                {#if isProxy}
                    {#each filteredProxies as proxy}
                        <div class="flex flex-col gap-1">
                            {#each proxy.abi as func}
                                <ContractFunction
                                    {func}
                                    onFunctionCall={_onFunctionCall}
                                    isProxy={true}
                                />
                            {/each}
                        </div>
                    {/each}
                {/if}

                {#each filteredAbi as func}
                    <ContractFunction {func} onFunctionCall={_onFunctionCall} />
                {/each}

                <CalldataBytes onFunctionCall={_onFunctionCall} />
            </div>
        {/if}
    {/if}
</div>
