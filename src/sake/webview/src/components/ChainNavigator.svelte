<script lang="ts">
    import { SakeProviderType } from '../../shared/storage_types';
    import {
        deleteStateSave,
        openChainsQuickPick,
        saveState,
        toggleAutosave
    } from '../helpers/api';
    import { getCssVarWithOpacity } from '../helpers/helpers';
    import { appState, chainNavigator, currentChain } from '../helpers/stores';
    import AdvancedLocalChainSetup from './AdvancedLocalChainSetup.svelte';
    import ClickableSpan from './ClickableSpan.svelte';
    import CopyableSpan from './CopyableSpan.svelte';
    import Divider from './Divider.svelte';
    import TextContainer from './TextContainer.svelte';
    import BlankIcon from './icons/BlankIcon.svelte';
    import CloseIcon from './icons/CloseIcon.svelte';
    import DefaultButton from './icons/DefaultButton.svelte';
    import DeleteIcon from './icons/DeleteIcon.svelte';
    import ExpandButton from './icons/ExpandButton.svelte';
    import IconContainer from './icons/IconContainer.svelte';
    import InfoIcon from './icons/InfoIcon.svelte';
    import MultipleWindowsIcon from './icons/MultipleWindowsIcon.svelte';
    import SaveIcon from './icons/SaveIcon.svelte';
    import WarningIcon from './icons/WarningIcon.svelte';
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
                    <!-- <span class="flex gap-1 items-center">
                        <MultipleWindowsIcon />
                        <span class="text-xs">{$chainState.chains.length}</span>
                    </span> -->
                    <MultipleWindowsIcon />
                </DefaultButton>

                {#if $appState.initializationState !== 'ready'}
                    <span class="truncate font-semibold">Chain Manager</span>
                {:else if !$currentChain}
                    <span class="truncate font-semibold">No chain selected</span>
                {:else if $currentChain.connected}
                    <span class="truncate font-semibold"
                        >Connected to {$currentChain.chainName}</span
                    >
                {:else}
                    <span class="truncate flex gap-1">
                        <WarningIcon />
                        <span class="font-semibold"
                            >Disconnected from {$currentChain.chainName}</span
                        >
                    </span>
                {/if}

                <ExpandButton
                    callback={chainNavigator.toggleExpanded}
                    expanded={$chainNavigator.expanded}
                    leftIcon={true}
                />

                <!-- <BlankIcon /> -->
            </div>
            {#if $chainNavigator.expanded}
                <!-- Chain Info and other general stuff -->
                {#if $currentChain}
                    <Divider className="my-0" />
                    <div class="text-sm opacity-75 text-center mt-1">Chain Info</div>
                    <div class="flex flex-col gap-1 p-2">
                        <!-- <span>
                            <span class="opacity-50">Chain Type:</span>
                            <span class="truncate">{$currentChain.type}</span>
                        </span> -->

                        {#if $currentChain.network.config.uri}
                            <span>
                                <span class="opacity-50">Connection URI:</span>
                                <CopyableSpan
                                    text={$currentChain.network.config.uri}
                                    className="truncate"
                                />
                            </span>
                        {/if}
                        {#if $currentChain.network.config.fork}
                            <span>
                                <span class="opacity-50">Fork:</span>
                                <span class="truncate">
                                    {$currentChain.network.config.fork}
                                </span>
                            </span>
                        {/if}
                        {#if $currentChain.network.config.chainId}
                            <span>
                                <span class="opacity-50">Chain ID:</span>
                                <span class="truncate">
                                    {$currentChain.network.config.chainId}
                                </span>
                            </span>
                        {/if}
                        {#if $currentChain.network.config.hardfork}
                            <span>
                                <span class="opacity-50">Hardfork:</span>
                                <span class="truncate">
                                    {$currentChain.network.config.hardfork}
                                </span>
                            </span>
                        {/if}
                    </div>
                {/if}

                <!-- <div class="flex flex-col gap-3 p-2 font-sm">
                    <ClickableSpan callback={() => {}}>
                        <span>Reset chain</span>
                    </ClickableSpan>
                </div> -->

                <!-- Persistence -->
                <Divider className="my-0" />
                <div class="text-sm opacity-75 text-center mt-1">Persistence</div>

                <div class="flex flex-col gap-3 p-2 font-sm">
                    {#if $currentChain?.type === SakeProviderType.Connection}
                        <div class="flex flex-row gap-3 items-center">
                            <InfoIcon />

                            <span class="text-sm opacity-75">
                                Chains which are <span class="italic">connected to</span> don't support
                                state persistence and only save the connection URI.
                            </span>
                        </div>
                    {/if}
                    <ClickableSpan
                        callback={saveState}
                        disabled={!$currentChain?.persistence.isDirty &&
                            $currentChain?.persistence.lastSaveTimestamp !== undefined}
                    >
                        <SaveIcon />

                        <div class="flex flex-col">
                            <span>
                                {$currentChain?.persistence.isDirty ||
                                $currentChain?.persistence.lastSaveTimestamp === undefined
                                    ? 'Click to save state changes'
                                    : 'All changes saved'}
                            </span>

                            {#if $currentChain?.persistence.lastSaveTimestamp}
                                <span class="text-xs">
                                    Last saved:
                                    {new Date(
                                        $currentChain.persistence.lastSaveTimestamp
                                    ).toLocaleString()}
                                </span>
                            {/if}
                        </div>
                    </ClickableSpan>

                    {#if $currentChain?.persistence.lastSaveTimestamp !== undefined}
                        <ClickableSpan callback={deleteStateSave}>
                            <DeleteIcon />
                            <span>Delete state save</span>
                        </ClickableSpan>
                    {/if}

                    <ClickableSpan callback={toggleAutosave}>
                        <BlankIcon />
                        {$currentChain?.persistence.isAutosaveEnabled ? 'Disable' : 'Enable'}
                        state autosaving
                    </ClickableSpan>
                </div>

                <!-- Snapshots -->
                <!-- <Divider className="my-0" />
                <div class="text-sm opacity-75 text-center mt-1">Snapshots</div>
                <div class="flex flex-col gap-3 p-2 font-sm">
                    <ClickableSpan callback={() => {}}>
                        <PlusIcon />
                        <span>Create snapshot</span>
                    </ClickableSpan>
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
