<script lang="ts">
    import FlexContainer from '../components/common/FlexContainer.svelte';
    import ViewShrink from '../components/common/ViewShrink.svelte';
    import BackIcon from '../components/icons/BackIcon.svelte';
    import TransactionParameters from '../views/TransactionParameters.svelte';
    import ViewGrow from '../components/common/ViewScrollable.svelte';
    import ViewHeader from '../components/common/ViewHeader.svelte';
    import { compilationIssuesVisible, txParametersExpanded } from '../stores/appStore';
    import Compile from '../views/Compile.svelte';
    import BlankIcon from '../components/icons/BlankIcon.svelte';
    import Deploy from '../views/Deploy.svelte';
    import ChevronDown from '../components/icons/ChevronDown.svelte';
    import ChevronRight from '../components/icons/ChevronRight.svelte';
    import ViewStatic from '../components/common/ViewStatic.svelte';
    import ViewScrollable from '../components/common/ViewScrollable.svelte';
</script>

<FlexContainer>
    <ViewStatic>
        <svelte:fragment slot="header">
            <BlankIcon />
            <span>Compile</span>
        </svelte:fragment>
        <svelte:fragment slot="content">
            <Compile />
        </svelte:fragment>
    </ViewStatic>
    <ViewScrollable>
        <svelte:fragment slot="header">
            <BlankIcon />
            <span>Deploy</span>
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
