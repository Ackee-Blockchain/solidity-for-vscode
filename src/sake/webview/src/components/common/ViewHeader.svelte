<script lang="ts">
</script>

<div class="w-full mr-[1px] flex header">
    <slot />
</div>

<style>
    .header {
        background: var(--vscode-sideBarSectionHeader-background);
        line-height: 22px;
        height: 22px;
        min-height: 22px;
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
        border-top: 1px solid var(--vscode-tab-border);
        border-right: 1px solid var(--vscode-tab-border);
    }
</style>
