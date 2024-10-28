<script lang="ts">
    import { currentChain } from '../helpers/stores';
    import TextContainer from './TextContainer.svelte';
    import MultipleWindowsIcon from './icons/MultipleWindowsIcon.svelte';
    import BlankIcon from './icons/BlankIcon.svelte';
    import { openChainsQuickPick } from '../helpers/api';
    import { chainNavigatorExpanded, chainNavigatorState } from '../helpers/stores';
    import ExpandButton from './icons/ExpandButton.svelte';
    import DefaultButton from './icons/DefaultButton.svelte';
    import Divider from './Divider.svelte';
    import ClickableSpan from './ClickableSpan.svelte';
</script>

<!-- <ViewHeader>
    <span>Chain Status</span>
</ViewHeader> -->

<div class="p-2">
    {#if $chainNavigatorState === 'default'}
        <TextContainer
            classList="chain-status-container {$chainNavigatorExpanded
                ? 'chain-status-container--expanded'
                : ''}"
        >
            <div class="flex gap-1 items-center text-sm h-[26px] justify-between">
                <ExpandButton bind:expanded={$chainNavigatorExpanded} />
                <!-- <BlankIcon /> -->

                {#if !$currentChain}
                    <span class="truncate">No chain selected</span>
                {:else if $currentChain.connected}
                    <span class="truncate">Connected to {$currentChain?.chainName}</span>
                {:else}
                    <span class="truncate">Disconnected from {$currentChain?.chainName}</span>
                {/if}
                <DefaultButton callback={openChainsQuickPick}>
                    <MultipleWindowsIcon />
                </DefaultButton>
            </div>
            {#if $chainNavigatorExpanded}
                <Divider className="" />
                <div class="flex flex-col gap-1 p-2">
                    <ClickableSpan callback={() => {}}>Create snapshot</ClickableSpan>
                    <ClickableSpan callback={() => {}}>Rename</ClickableSpan>
                    <ClickableSpan callback={() => {}}>Duplicate chain</ClickableSpan>
                    <ClickableSpan callback={() => {}}>Delete chain</ClickableSpan>
                </div>
                <Divider className="" />
                <div class="flex flex-col gap-1 p-2">
                    <ClickableSpan callback={() => {}}>Create new chain</ClickableSpan>
                    <ClickableSpan callback={() => {}}>Manage chains</ClickableSpan>
                    <ClickableSpan callback={() => {}}>Manage accounts</ClickableSpan>
                </div>
            {/if}
        </TextContainer>
    {:else if $chainNavigatorState === 'createNewChain'}
        <TextContainer>
            <span>Create new chain</span>
        </TextContainer>
    {/if}
</div>

<style>
    /* @dev global to force css style to be included */
    :global(.chain-status-container) {
        padding: 0 !important;
    }

    :global(.chain-status-container:not(.chain-status-container--expanded)) {
        height: 26px !important;
    }
</style>
