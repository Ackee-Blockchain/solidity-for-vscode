<script lang="ts">
    import { SvelteComponent, type ComponentType } from 'svelte';
    import { activeTabId } from '../../stores/appStore';

    export let tabs: { id: any; label: string; content: ComponentType; header?: ComponentType }[];
</script>

<div class="flex flex-col w-full flex-grow h-full">
    <div class="w-full">
        <div class="overflow-x-auto">
            <ul class="flex vscode-gap mb-1 monaco-nav justify-around">
                {#each tabs as tab}
                    <li
                        class="text-sm uppercase whitespace-nowrap
                        flex items-center cursor-pointer"
                    >
                        <!-- svelte-ignore a11y-click-events-have-key-events -->
                        <!-- svelte-ignore a11y-missing-attribute -->
                        <a
                            class="monaco-button flex gap-2"
                            class:active={$activeTabId === tab.id}
                            on:click={() => activeTabId.set(tab.id)}
                        >
                            {#if tab.header}
                                <svelte:component this={tab.header} />
                            {:else}
                                <span>{tab.label}</span>
                            {/if}
                        </a>
                    </li>
                {/each}
            </ul>
        </div>
    </div>

    {#each tabs as tab}
        {#if $activeTabId === tab.id}
            <svelte:component this={tab.content} />
        {/if}
    {/each}
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
