<script lang="ts">
    import FlexContainer from '../components/common/FlexContainer.svelte';
    import ViewShrink from '../components/common/ViewShrink.svelte';
    import BackIcon from '../components/icons/BackIcon.svelte';
    import TransactionParameters from '../views/TransactionParameters.svelte';
    import ViewGrow from '../components/common/ViewScrollable.svelte';
    import ViewHeader from '../components/common/ViewHeader.svelte';
    import {
        compilationIssuesVisible,
        selectedAccount,
        selectedValue,
        selectedValueString,
        txParametersExpanded
    } from '../stores/appStore';
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
    <ViewScrollable>
        <svelte:fragment slot="header">
            <BlankIcon />
            <span>Deploy contracts</span>
        </svelte:fragment>
        <svelte:fragment slot="content">
            <Deploy />
        </svelte:fragment>
    </ViewScrollable>
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
                        ({$selectedAccount?.nick ?? $selectedAccount?.address},
                        {displayEtherValue($selectedValue)})
                    </span>
                {/if}
            </a>
        </svelte:fragment>
        <svelte:fragment slot="content">
            <TransactionParameters />
        </svelte:fragment>
    </ViewStatic>
</FlexContainer>
