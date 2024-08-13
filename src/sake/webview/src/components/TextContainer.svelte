<script lang="ts">
    export let danger: boolean = false;
    export let warning: boolean = false;
    export let classList: string = '';
</script>

<div
    class="vscode-text-container
    {danger ? 'vscode-text-container--danger' : ''}
    {warning ? 'vscode-text-container--warning' : ''}
    {classList}"
>
    <slot></slot>
</div>

<style>
    .vscode-text-container {
        /* padding: 0 calc(var(--design-unit) * 2px + 1px); */
        padding: calc(var(--design-unit) * 1px + 1px) calc(var(--design-unit) * 2px + 1px);
        border: calc(var(--border-width) * 1px) solid var(--button-border);
        border-radius: calc(var(--corner-radius-round) * 1px);
        color: var(--input-foreground);
        background-color: var(--input-background);
    }

    .vscode-text-container--danger {
        border-color: var(--vscode-editorError-foreground);
        color: var(--vscode-editorError-foreground);
    }

    .vscode-text-container--warning {
        border-color: var(--vscode-editorWarning-foreground);
        color: var(--vscode-editorWarning-foreground);
    }
</style>
