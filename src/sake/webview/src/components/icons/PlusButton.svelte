<script lang="ts">
    export let callback = () => {};

    function handleClick() {
        callback();
    }
</script>

<button class="flex-initial rounded bg-transparent p-[4px] h-[26px] w-[26px]" on:click={handleClick}>
    <!-- plus from codicons-->
    <svg width="16" height="16" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg" fill="currentColor"><path d="M14 7v1H8v6H7V8H1V7h6V1h1v6h6z"/></svg>
</button>