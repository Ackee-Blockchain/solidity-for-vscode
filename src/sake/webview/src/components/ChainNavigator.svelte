<script lang="ts">
    import { currentChain } from '../helpers/stores';
    import TextContainer from './TextContainer.svelte';
    import MultipleWindowsIcon from './icons/MultipleWindowsIcon.svelte';
    import BlankIcon from './icons/BlankIcon.svelte';
    import { openChainsQuickPick } from '../helpers/api';
    import { chainNavigator } from '../helpers/stores';
    import ExpandButton from './icons/ExpandButton.svelte';
    import DefaultButton from './icons/DefaultButton.svelte';
    import Divider from './Divider.svelte';
    import ClickableSpan from './ClickableSpan.svelte';
    import CloseIcon from './icons/CloseIcon.svelte';
    import AdvancedLocalChainSetup from './AdvancedLocalChainSetup.svelte';
    import { getCssVarWithOpacity } from '../helpers/helpers';
    import WarningIcon from './icons/WarningIcon.svelte';
    import ErrorIcon from './icons/ErrorIcon.svelte';
</script>

<!-- <ViewHeader>
    <span>Chain Status</span>
</ViewHeader> -->

<div class="p-2">
    <!-- Placeholder to maintain layout space -->
    <div class="h-[26px]"></div>

    <!-- Backdrop overlay -->
    {#if $chainNavigator.state === 'advancedLocalChainSetup'}
        <!-- svelte-ignore a11y-click-events-have-key-events -->
        <div
            class="fixed inset-0 z-[5]"
            style="background: {getCssVarWithOpacity('--vscode-sideBar-background', 0.8)}"
        />
    {/if}

    <TextContainer
        classList="chain-navigator-container {$chainNavigator.expanded
            ? 'chain-navigator-container--expanded'
            : ''}"
    >
        {#if $chainNavigator.state === 'default'}
            <div class="flex gap-1 items-center text-sm h-[26px] justify-between">
                <DefaultButton callback={openChainsQuickPick}>
                    <MultipleWindowsIcon />
                </DefaultButton>
                <!-- <ExpandButton
                    callback={chainNavigator.toggleExpanded}
                    expanded={$chainNavigator.expanded}
                /> -->

                {#if !$currentChain}
                    <span class="truncate">No chain selected</span>
                {:else if $currentChain.connected}
                    <span class="truncate">Connected to {$currentChain?.chainName}</span>
                {:else}
                    <span class="truncate">Disconnected from {$currentChain?.chainName}</span>
                {/if}

                {#if !$currentChain?.connected}
                    <WarningIcon />
                {:else}
                    <BlankIcon />
                {/if}
            </div>
            {#if $chainNavigator.expanded}
                <!-- <Divider className="" />
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
                </div> -->
            {/if}
        {:else if $chainNavigator.state === 'advancedLocalChainSetup'}
            <div class="flex gap-1 items-center text-sm h-[26px] justify-between">
                <DefaultButton callback={chainNavigator.clear}>
                    <CloseIcon />
                </DefaultButton>
                <!-- <BlankIcon /> -->

                <span class="truncate">Advanced Local Chain Setup</span>
                <BlankIcon />
            </div>
            <Divider className="" />
            <AdvancedLocalChainSetup />
        {/if}
    </TextContainer>
</div>

<style>
    /* @dev global to force css style to be included */
    :global(.chain-navigator-container) {
        padding: 0 !important;
        position: absolute;
        top: 8px; /* to account for parent p-2 */
        left: 8px; /* to account for parent p-2 */
        right: 8px;
        z-index: 10;
    }

    :global(.chain-navigator-container--expanded) {
        box-shadow: rgba(0, 0, 0, 0.36) 0px 0px 8px 2px;
    }

    :global(.chain-navigator-container:not(.chain-navigator-container--expanded)) {
        height: 26px !important;
    }
</style>
