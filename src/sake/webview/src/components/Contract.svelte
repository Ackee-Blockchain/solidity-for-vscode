<script lang="ts">
    import {
        DeployedContractType,
        type AbiFunctionFragment,
        type DeployedContract
    } from '../../shared/types';
    import {
        openAddAbiQuickPick,
        removeDeployedContract,
        removeProxy,
        requestLabel
    } from '../helpers/api';
    import CalldataBytes from './CalldataBytes.svelte';
    import ClickableSpan from './ClickableSpan.svelte';
    import ContractFunction from './ContractFunction.svelte';
    import CopyableSpan from './CopyableSpan.svelte';
    import DefaultButton from './icons/DefaultButton.svelte';
    import DeleteButton from './icons/DeleteButton.svelte';
    import ExpandButton from './icons/ExpandButton.svelte';
    import RadioTowerCrossedIcon from './icons/RadioTowerCrossedIcon.svelte';
    import RadioTowerIcon from './icons/RadioTowerIcon.svelte';

    export let contract: DeployedContract;
    export let onFunctionCall: (
        calldata: string,
        contractAddress: string,
        func: AbiFunctionFragment
    ) => Promise<boolean>;
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

    const _onFunctionCall = async (
        calldata: string,
        func: AbiFunctionFragment
    ): Promise<boolean> => {
        return await onFunctionCall(calldata, contract.address, func);
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
                    {#if isProxy}
                        <!-- @dev currently only supports one proxy -->
                        <DefaultButton
                            callback={() => {
                                if (contract.proxyFor?.[0]?.id) {
                                    removeProxy(contract.address, contract.proxyFor[0].id);
                                }
                            }}
                        >
                            <RadioTowerCrossedIcon />
                        </DefaultButton>
                    {:else}
                        <DefaultButton callback={() => openAddAbiQuickPick(contract.address)}>
                            <RadioTowerIcon />
                        </DefaultButton>
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
        <div class="flex flex-col gap-1">
            {#each filteredProxies as proxy}
                {#each proxy.abi as func}
                    <ContractFunction {func} onFunctionCall={_onFunctionCall} isProxy={true} />
                {/each}
            {/each}

            {#each filteredAbi as func}
                <ContractFunction {func} onFunctionCall={_onFunctionCall} />
            {/each}

            <CalldataBytes onFunctionCall={_onFunctionCall} />
        </div>
    {/if}
</div>
