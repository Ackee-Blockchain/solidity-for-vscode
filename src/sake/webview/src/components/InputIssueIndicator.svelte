<script lang="ts">
    import TextContainer from './TextContainer.svelte';

    export let type: 'normal' | 'warning' | 'danger' = 'normal';
</script>

<div class="relative inline-block group">
    <span
        class="cursor-pointer"
        class:text-vscodeError={type === 'danger'}
        class:text-vscodeWarning={type === 'warning'}
    >
        <svg
            width="16"
            height="16"
            viewBox="0 0 16 16"
            xmlns="http://www.w3.org/2000/svg"
            fill="currentColor"
            ><path
                fill-rule="evenodd"
                clip-rule="evenodd"
                d="M7.56 1h.88l6.54 12.26-.44.74H1.44L1 13.26 7.56 1zM8 2.28L2.28 13H13.7L8 2.28zM8.625 12v-1h-1.25v1h1.25zm-1.25-2V6h1.25v4h-1.25z"
            /></svg
        >
    </span>

    <div
        class="absolute invisible group-hover:visible opacity-0 group-hover:opacity-100
        right-full top-1/2 transform -translate-y-1/2 mr-2 w-max z-[999]"
    >
        <TextContainer danger={type === 'danger'} warning={type === 'warning'}>
            <div class="flex flex-col gap-1 text-sm">
                <slot />
            </div>
        </TextContainer>
    </div>
</div>
