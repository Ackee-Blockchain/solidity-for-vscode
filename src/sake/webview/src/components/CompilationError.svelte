<script lang="ts">
    import {
        provideVSCodeDesignSystem,
        vsCodeTextField,
        vsCodeButton
    } from '@vscode/webview-ui-toolkit';
    import IconButton from './IconButton.svelte';
    import IconSpacer from './icons/IconSpacer.svelte';
    import ExpandButton from './icons/ExpandButton.svelte';
    import DeleteButton from './icons/DeleteButton.svelte';
    import CopyButton from './icons/CopyButton.svelte';
    import InputIssueIndicator from './InputIssueIndicator.svelte';
    import type {
        CompilationError,
        Contract,
        ContractAbi,
        ContractFunction as ContractFunctionType
    } from '../../shared/types';
    import ContractFunction from './ContractFunction.svelte';
    import TextContainer from './TextContainer.svelte';

    provideVSCodeDesignSystem().register(vsCodeButton(), vsCodeTextField());

    export let error: CompilationError;
    let expanded: boolean = false;
    $: expandable = error.errors.length > 0;
</script>

<div class="w-full flex flex-row items-start flex-1 gap-1">
    {#if expandable}
        <ExpandButton bind:expanded />
    {:else}
        <IconSpacer />
    {/if}
    <TextContainer classList="w-full flex flex-col gap-3 overflow-hidden">
        <div class="w-full flex flex-row gap-2 items-center">
            <span class="text-vscodeError">
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
            <span>{error.fqn}</span>
        </div>
        {#if expanded}
            <div class="flex flex-col gap-2 text-sm">
                {#each error.errors as errorMessage}
                    <span>{errorMessage}</span>
                {/each}
            </div>
        {/if}
    </TextContainer>
</div>
