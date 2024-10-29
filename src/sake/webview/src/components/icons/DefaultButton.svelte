<script lang="ts">
    export let callback: () => void;
    export let className = '';
    export let style = '';
</script>

<button
    class="no-outline-on-focuz flex-initial rounded bg-transparent p-[4px] h-[26px] w-[26px] hover:bg-transparent focus:bg-transparent !focus:outline-none hover:text-vscodeButtonPrimary {className}"
    {style}
    on:click={callback}
>
    <slot />
</button>

<style>
    .no-outline-on-focuz:focus {
        outline-color: transparent !important;
    }
</style>
