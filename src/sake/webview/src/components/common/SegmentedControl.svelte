<script lang="ts">
    import { createEventDispatcher } from 'svelte';
    import DefaultButton from '../icons/DefaultButton.svelte';

    const dispatch = createEventDispatcher<{
        change: number;
    }>();

    export let options: string[];
    export let selectedIndex: number = 0;

    function handleChange(index: number) {
        selectedIndex = index;
        // Dispatch the event
        dispatch('change', index);
    }
</script>

<div class="vscode-button-border flex rounded vscode-bg-input">
    {#each options as option, index}
        <DefaultButton
            className="grow {selectedIndex === index ? 'hover:text-white text-white' : ''}"
            callback={() => handleChange(index)}
            style={selectedIndex === index
                ? 'background-color: var(--vscode-button-background);'
                : ''}
        >
            {option}
        </DefaultButton>
    {/each}
</div>
