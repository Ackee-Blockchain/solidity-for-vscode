<script lang="ts">
    import ViewHeader from './ViewHeader.svelte';
</script>

<div class="w-full flex flex-col flex-1 overflow-hidden">
    <ViewHeader>
        <slot name="header" />
    </ViewHeader>
    <div class="flex-grow overflow-y-scroll">
        <slot name="content" />
    </div>
</div>
