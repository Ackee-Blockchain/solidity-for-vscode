<script lang="ts">
    export let className: string | undefined = undefined;
</script>

<hr class={className ?? 'my-3'} />

<style>
    hr {
        border: 0;
        border-top: 1px solid var(--vscode-sideBar-dropBackground);
    }
</style>
