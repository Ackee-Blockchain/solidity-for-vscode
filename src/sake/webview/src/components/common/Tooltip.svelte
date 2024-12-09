<script lang="ts">
    import TextContainer from './../TextContainer.svelte';
    import InfoIcon from './../icons/InfoIcon.svelte';
    import { onMount } from 'svelte';

    export let align: 'left' | 'right' = 'right';
    let tooltipContainer: HTMLDivElement;
    let maxWidth = 0;

    function updateMaxWidth() {
        if (tooltipContainer) {
            const rect = tooltipContainer.getBoundingClientRect();
            const viewportWidth = window.innerWidth;
            maxWidth = align === 'left' ? rect.left - 5 : viewportWidth - rect.right - 5;
        }
    }

    onMount(() => {
        updateMaxWidth();
        window.addEventListener('resize', updateMaxWidth);
        return () => window.removeEventListener('resize', updateMaxWidth);
    });
</script>

<div class="relative inline-block group">
    <span class="cursor-pointer">
        <slot name="content" />
    </span>

    <div
        bind:this={tooltipContainer}
        class="absolute invisible group-hover:visible opacity-0 group-hover:opacity-100 w-max z-[999] vscode-box-shadow
        transition-[opacity] group-hover:delay-500 delay-0
        {align === 'right'
            ? 'left-full top-1/2 transform -translate-y-1/2 ml-2'
            : 'right-full top-1/2 transform -translate-y-1/2 mr-2'}"
        style="max-width: {maxWidth}px;"
    >
        <TextContainer>
            <div class="flex flex-col gap-1 text-sm">
                <slot name="tooltip" />
            </div>
        </TextContainer>
    </div>
</div>
