<script lang="ts">
    export let className = '';
    export let callback: () => void;
    export let disabled = false;
</script>

<!-- svelte-ignore a11y-click-events-have-key-events -->
<div
    class="{disabled
        ? 'cursor-default opacity-50'
        : 'cursor-pointer hover:underline'} {className} flex flex-row gap-1 w-full"
    on:click={callback}
>
    <slot />
</div>
