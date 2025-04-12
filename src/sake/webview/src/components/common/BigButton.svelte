<script lang="ts">
    import { createEventDispatcher } from 'svelte';

    export let label: string = '';
    export let icon: any = null;
    export let disabled: boolean = false;
    export let className: string = '';
    export let iconUrl: string = '';
    export let active: boolean = false;
    export let description: string = '';
    const dispatch = createEventDispatcher();

    function handleClick() {
        if (!disabled) {
            dispatch('click');
        }
    }
</script>

<button
    class="no-outline-focus grid grid-cols-[auto_1fr] gap-3 py-2 px-3 rounded vscode-button-border vscode-bg-input {className}"
    style={active ? 'background-color: var(--vscode-button-background);' : ''}
    on:click={handleClick}
    {disabled}
>
    <!-- Icon area -->
    <div class="self-center">
        {#if icon}
            <div class="text-2xl">
                <svelte:component this={icon} />
            </div>
        {:else if iconUrl}
            <img src={iconUrl} alt="Icon" class="w-6 h-6" />
        {/if}
    </div>

    <!-- Content area -->
    <div class="flex flex-col text-left self-center {active ? 'text-white' : ''}">
        {#if label}
            <span class="font-medium">{label}</span>
        {/if}
        <span class="text-xs text-vscodeForeground">{description}</span>
    </div>
</button>

<style>
    .no-outline-focus:focus {
        outline: none !important;
    }
</style>
