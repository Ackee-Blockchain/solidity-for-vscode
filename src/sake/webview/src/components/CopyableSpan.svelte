<script lang="ts">
    import { copyToClipboard } from '../helpers/api';

    export let className = '';
    export let text: string;
</script>

<!-- svelte-ignore a11y-click-events-have-key-events -->
<span class="copyable {className}" on:click={() => copyToClipboard(text)}>{text}</span>

<style>
    .copyable {
        cursor: pointer;
    }

    .copyable:hover {
        text-decoration: underline;
    }
</style>
