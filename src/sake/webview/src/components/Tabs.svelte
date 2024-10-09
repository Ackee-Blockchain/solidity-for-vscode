<script lang="ts">
    import { activeTab } from '../helpers/store';
    import { onMount } from 'svelte';

    export let tabs: { id: any; label: string }[];

    onMount(() => {
        console.log('Slots:', $$slots);
    });
</script>

<div class="flex flex-col h-full w-full">
    <div class="w-full">
        <div class="overflow-x-auto">
            <ul class="flex vscode-gap mb-4 monaco-nav justify-around">
                {#each tabs as tab}
                    <li
                        class="text-sm uppercase whitespace-nowrap
                        flex items-center cursor-pointer"
                    >
                        <!-- svelte-ignore a11y-click-events-have-key-events -->
                        <!-- svelte-ignore a11y-missing-attribute -->
                        <a
                            class="monaco-button flex gap-2"
                            class:active={$activeTab === tab.id}
                            on:click={() => activeTab.set(tab.id)}
                        >
                            <span>{tab.label}</span>
                            <slot name="tab-header" tabId={tab.id} class="ms-1" />
                        </a>
                    </li>
                {/each}
            </ul>
        </div>
    </div>

    {#if $$slots['header-top']}
        <div class="w-full mr-[1px] flex header">
            <slot name="header-top" />
        </div>
    {/if}

    {#if $$slots['content-top']}
        <div class="w-full flex-shrink overflow-y-auto overflow-x-hidden p-[10px]">
            <slot name="content-top" />
        </div>
    {/if}

    {#if $$slots['middle-header']}
        <div class="w-full mr-[1px] flex header">
            <slot name="middle-header" />
        </div>
    {/if}

    <div class="w-full flex-1 overflow-y-auto overflow-x-hidden p-[10px]">
        <slot name="content-middle" />
    </div>

    {#if $$slots['bottom-header']}
        <div class="w-full mr-[1px] flex header">
            <slot name="bottom-header" />
        </div>
    {/if}

    <div class="w-full flex-shrink overflow-y-auto overflow-x-hidden p-[10px]">
        <slot name="bottom-fixed" />
    </div>
</div>

<style>
    .header {
        background: var(--vscode-sideBarSectionHeader-background);
        line-height: 22px;
        height: 22px;
        overflow: hidden;
        font-weight: 700;
        font-size: 11px;
        min-width: 3ch;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        text-transform: uppercase;
        color: var(--vscode-sideBarSectionHeader-foreground);
        padding: 0 2px;
        border-top: 1px solid var(--vscode-sideBar-dropBackground);
    }

    .middle-header:empty {
        height: 1px;
    }

    .vscode-gap {
        gap: calc(var(--design-unit) * 8px);
    }

    /* .vscode-shadow {
        box-shadow: var(--vscode-panelStickyScroll-shadow) 0 6px 6px -6px inset;
    } */

    .monaco-nav {
        padding: 0 calc(var(--design-unit) * 2px);
    }

    .monaco-button {
        color: var(--vscode-breadcrumb-foreground);
        padding: 4px 2px;
    }

    .monaco-button:hover {
        color: var(--vscode-icon-foreground);
    }

    .monaco-button.active {
        color: var(--vscode-icon-foreground);
        border-bottom: 1px solid var(--vscode-panelTitle-activeBorder);
    }
</style>
