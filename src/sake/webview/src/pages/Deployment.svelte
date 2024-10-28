<script lang="ts">
    import FlexContainer from '../components/common/FlexContainer.svelte';
    import TransactionParameters from '../views/TransactionParameters.svelte';
    import {
        selectedAccount,
        selectedAccountId,
        selectedValue,
        txParametersExpanded
    } from '../helpers/stores';
    import Compile from '../views/Compile.svelte';
    import BlankIcon from '../components/icons/BlankIcon.svelte';
    import Deploy from '../views/Deploy.svelte';
    import ChevronDown from '../components/icons/ChevronDown.svelte';
    import ChevronRight from '../components/icons/ChevronRight.svelte';
    import ViewStatic from '../components/common/ViewStatic.svelte';
    import ViewScrollable from '../components/common/ViewScrollable.svelte';
    import { displayEtherValue } from '../../shared/ether';
</script>

<FlexContainer>
    <ViewStatic>
        <svelte:fragment slot="header">
            <BlankIcon />
            <span>Compile contracts</span>
        </svelte:fragment>
        <svelte:fragment slot="content">
            <Compile />
        </svelte:fragment>
    </ViewStatic>
    <ViewStatic>
        <svelte:fragment slot="header">
            <!-- svelte-ignore a11y-click-events-have-key-events -->
            <!-- svelte-ignore a11y-missing-attribute -->
            <a
                on:click={() => txParametersExpanded.set(!$txParametersExpanded)}
                class="flex gap-1 cursor-pointer items-center w-full"
            >
                {#if $txParametersExpanded}
                    <ChevronDown />
                    <span>Transaction Parameters</span>
                {:else}
                    <ChevronRight />
                    <span>Transaction Parameters</span>

                    <span class="text-xs text-vscodeForegroundSecondary font-normal ml-auto pr-2">
                        ({$selectedAccountId !== null
                            ? ($selectedAccount?.label ?? `Account ${$selectedAccountId}`)
                            : 'No account selected'},
                        {displayEtherValue($selectedValue)})
                    </span>
                {/if}
            </a>
        </svelte:fragment>
        <svelte:fragment slot="content">
            <TransactionParameters />
        </svelte:fragment>
    </ViewStatic>
    <ViewScrollable>
        <svelte:fragment slot="header">
            <BlankIcon />
            <span>Deploy contracts</span>
        </svelte:fragment>
        <svelte:fragment slot="content">
            <Deploy />
        </svelte:fragment>
    </ViewScrollable>
</FlexContainer>
