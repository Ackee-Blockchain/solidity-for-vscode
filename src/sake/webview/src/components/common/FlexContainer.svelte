<script lang="ts">
    export let direction: 'row' | 'column' = 'column';
</script>

<div
    class="flex {direction === 'row'
        ? 'flex-row'
        : 'flex-col'} w-full h-full flex-grow overflow-hidden"
>
    <slot />
</div>
