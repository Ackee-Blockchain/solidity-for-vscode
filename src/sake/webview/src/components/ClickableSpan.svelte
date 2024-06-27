<script lang="ts">
    export let className = '';
    export let callback: () => void;
</script>

<!-- svelte-ignore a11y-click-events-have-key-events -->
<span class="clickable {className}" on:click={callback}><slot /></span>

<style>
    .clickable {
        cursor: pointer;
    }

    .clickable:hover {
        text-decoration: underline;
    }
</style>
