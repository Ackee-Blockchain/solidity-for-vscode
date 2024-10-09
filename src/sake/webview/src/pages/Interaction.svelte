<script lang="ts">
    import FlexContainer from '../components/common/FlexContainer.svelte';
    import ViewStatic from '../components/common/ViewStatic.svelte';
    import TransactionParameters from '../views/TransactionParameters.svelte';
    import ViewScrollable from '../components/common/ViewScrollable.svelte';
    import ViewHeader from '../components/common/ViewHeader.svelte';
    import Compile from '../views/Compile.svelte';
    import BlankIcon from '../components/icons/BlankIcon.svelte';
    import Run from '../views/Run.svelte';
    import { txParametersExpanded } from '../stores/appStore';
    import ChevronDown from '../components/icons/ChevronDown.svelte';
    import ChevronRight from '../components/icons/ChevronRight.svelte';
</script>

<FlexContainer>
    <ViewScrollable>
        <svelte:fragment slot="header">
            <BlankIcon />
            <span>Interact</span>
        </svelte:fragment>
        <svelte:fragment slot="content">
            <Run />
        </svelte:fragment>
    </ViewScrollable>
    <ViewStatic>
        <svelte:fragment slot="header">
            <!-- svelte-ignore a11y-click-events-have-key-events -->
            <!-- svelte-ignore a11y-missing-attribute -->
            <a
                on:click={() => txParametersExpanded.set(!$txParametersExpanded)}
                class="flex gap-1 cursor-pointer items-center"
            >
                {#if $txParametersExpanded}
                    <ChevronDown />
                {:else}
                    <ChevronRight />
                {/if}
                <span>Transaction Parameters</span>
            </a>
        </svelte:fragment>
        <svelte:fragment slot="content">
            <TransactionParameters />
        </svelte:fragment>
    </ViewStatic>
</FlexContainer>
