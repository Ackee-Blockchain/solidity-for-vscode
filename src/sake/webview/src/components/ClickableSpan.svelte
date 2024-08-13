<script lang="ts">
    export let className = '';
    export let callback: () => void;
</script>

<!-- svelte-ignore a11y-click-events-have-key-events -->
<span class="cursor-pointer hover:underline {className}" on:click={callback}><slot /></span>
