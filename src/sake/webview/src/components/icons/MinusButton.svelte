<script lang="ts">
    import DefaultButton from './DefaultButton.svelte';

    export let callback = () => {};
</script>

<DefaultButton {callback}>
    <!-- remove form codicons -->
    <svg
        width="16"
        height="16"
        viewBox="0 0 16 16"
        xmlns="http://www.w3.org/2000/svg"
        fill="currentColor"><path d="M15 8H1V7h14v1z" /></svg
    >
</DefaultButton>
