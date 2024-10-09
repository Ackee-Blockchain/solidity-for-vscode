<script lang="ts">
    import ViewHeader from './ViewHeader.svelte';
</script>

<div class="w-full flex flex-col">
    <ViewHeader>
        <slot name="header" />
    </ViewHeader>
    <slot name="content" />
</div>
