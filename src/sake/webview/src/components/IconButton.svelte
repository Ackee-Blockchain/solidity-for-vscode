<script lang="ts">
    export let callback = () => {};
</script>

<button class="p-[4px] h-[26px] w-[26px] bg-transparent rounded" on:click={callback}>
    <!--bg-[#3c3c3c]-->
    <slot></slot>
</button>
