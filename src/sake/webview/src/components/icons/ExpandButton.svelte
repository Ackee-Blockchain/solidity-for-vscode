<script lang="ts">
    import DefaultButton from './DefaultButton.svelte';

    export let expanded: boolean;
    export let callback: () => void = () => {
        expanded = !expanded;
    };
</script>

<DefaultButton {callback}>
    {#if expanded}
        <!-- chevron down from codicons -->
        <svg
            width="16"
            height="16"
            viewBox="0 0 16 16"
            xmlns="http://www.w3.org/2000/svg"
            fill="currentColor"
            class="mx-auto"
            ><path
                fill-rule="evenodd"
                clip-rule="evenodd"
                d="M7.976 10.072l4.357-4.357.62.618L8.284 11h-.618L3 6.333l.619-.618 4.357 4.357z"
            /></svg
        >
    {:else}
        <!-- chevron right from codicons -->
        <svg
            width="16"
            height="16"
            viewBox="0 0 16 16"
            xmlns="http://www.w3.org/2000/svg"
            fill="currentColor"
            class="mx-auto"
            ><path
                fill-rule="evenodd"
                clip-rule="evenodd"
                d="M10.072 8.024L5.715 3.667l.618-.62L11 7.716v.618L6.333 13l-.618-.619 4.357-4.357z"
            /></svg
        >
    {/if}
</DefaultButton>
