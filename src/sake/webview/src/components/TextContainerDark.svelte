<script lang="ts">
    export let warning: boolean = false;
    export let className: string | undefined = undefined;
</script>

<div
    class="vscode-text-container {warning ? 'vscode-text-container--warning' : ''}
    {className ?? ''}"
>
    <slot></slot>
</div>

<style>
    .vscode-text-container {
        /* padding: 0 calc(var(--design-unit) * 2px + 1px); */
        padding: calc(var(--design-unit) * 1px + 1px) calc(var(--design-unit) * 2px + 1px);
        /* border: calc(var(--border-width) * 1px) solid var(--dropdown-border); */
        border-radius: calc(var(--corner-radius-round) * 1px);
        color: var(--input-foreground);
        background-color: var(--vscode-editorWidget-background);
    }

    .vscode-text-container--warning {
        border-color: var(--vscode-editorError-foreground);
        color: var(--vscode-editorError-foreground);
    }
</style>
