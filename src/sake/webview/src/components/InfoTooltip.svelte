<script lang="ts">
    import Tooltip from './common/Tooltip.svelte';
    import InfoIcon from './icons/InfoIcon.svelte';
    export let content: string;
</script>

<Tooltip>
    <span slot="content" class="block scale-75">
        <InfoIcon />
    </span>
    <span slot="tooltip">
        {content}
    </span>
</Tooltip>
