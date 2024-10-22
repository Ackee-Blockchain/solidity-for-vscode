<script lang="ts">
    import { currentChain } from '../stores/sakeStore';
    import TextContainer from './TextContainer.svelte';
    import MultipleWindowsIcon from './icons/MultipleWindowsIcon.svelte';
    import BlankIcon from './icons/BlankIcon.svelte';
    import { openChainsQuickPick } from '../helpers/api';
</script>

<!-- <ViewHeader>
    <span>Chain Status</span>
</ViewHeader> -->

<div class="p-2">
    <TextContainer classList="flex gap-1 items-center text-sm h-[26px] justify-between">
        <BlankIcon />
        {#if !$currentChain}
            <span class="truncate">No chain selected</span>
        {:else if $currentChain.connected}
            <span class="truncate">Connected to {$currentChain?.chainName}</span>
        {:else}
            <span class="truncate">Disconnected from {$currentChain?.chainName}</span>
        {/if}
        <!-- svelte-ignore a11y-click-events-have-key-events -->
        <span class="cursor-pointer" on:click={openChainsQuickPick}>
            <MultipleWindowsIcon />
        </span>
    </TextContainer>
</div>
