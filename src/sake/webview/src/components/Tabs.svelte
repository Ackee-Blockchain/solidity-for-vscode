<script lang="ts">
    import { createEventDispatcher } from 'svelte';
    import Divider from './Divider.svelte';

    const dispatch = createEventDispatcher();

    export let tabs: { id: any; label: string }[];
    $: activeTabId = tabs[0].id;

    function selectTab(tabId: string) {
        activeTabId = tabId;
        dispatch('tabChange', tabId);
    }
</script>

<div class="flex flex-col h-full w-full">
    <div class="w-full">
        <div class="overflow-x-auto">
            <ul class="flex vscode-gap mb-4 monaco-nav">
                {#each tabs as tab}
                    <li
                        class="text-sm uppercase whitespace-nowrap
                        flex items-center cursor-pointer"
                    >
                        <!-- svelte-ignore a11y-click-events-have-key-events -->
                        <!-- svelte-ignore a11y-missing-attribute -->
                        <a
                            class="monaco-button flex gap-2"
                            class:active={activeTabId === tab.id}
                            on:click={() => selectTab(tab.id)}
                        >
                            <span>{tab.label}</span>
                            <slot name="tab-header" tabId={tab.id} class="ms-1" />
                        </a>
                    </li>
                {/each}
            </ul>
        </div>
        <!-- <Divider /> -->
        <div class="w-full p-[10px] flex flex-col gap-4">
            <slot name="content-fixed" tabId={activeTabId}></slot>
        </div>
    </div>

    <Divider className="my-2" />

    <div class="w-full flex-1 overflow-y-auto overflow-x-hidden p-[10px]">
        <slot name="content-scrollable" tabId={activeTabId}></slot>
    </div>
</div>

<style>
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
