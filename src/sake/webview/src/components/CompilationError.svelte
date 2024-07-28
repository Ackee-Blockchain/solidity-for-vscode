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
        ContractFunction as ContractFunctionType,
        WakeErrorInfo
    } from '../../shared/types';
    import { CompilationErrorType } from '../../shared/types';
    import ContractFunction from './ContractFunction.svelte';
    import TextContainer from './TextContainer.svelte';
    import { navigateTo } from '../helpers/api';
    import ErrorIcon from './icons/ErrorIcon.svelte';
    import WarningIcon from './icons/WarningIcon.svelte';

    provideVSCodeDesignSystem().register(vsCodeButton(), vsCodeTextField());

    export let error: CompilationError;
    let expanded: boolean = false;
    $: expandable = error.errors.length > 0;
    $: fileName = error.fqn.split('/').pop();

    const asWakeErrorInfo = (error: any) => error as WakeErrorInfo;
    const asString = (error: any) => error as string;

    const navigateToFile = (_error: WakeErrorInfo) => {
        const errorMessage = asWakeErrorInfo(error.errors[0]);
        navigateTo(_error.path, _error.startOffset, _error.endOffset);
    };
</script>

<div class="w-full flex flex-row items-start flex-1 gap-1">
    {#if expandable}
        <ExpandButton bind:expanded />
    {:else}
        <IconSpacer />
    {/if}
    <TextContainer classList="w-full flex flex-col gap-3 overflow-hidden">
        <div class="w-full flex flex-row gap-2 items-center">
            {#if error.type === CompilationErrorType.Error}
                <ErrorIcon />
            {:else if error.type === CompilationErrorType.Skipped}
                <WarningIcon />
            {/if}

            <div class="flex col gap-1">
                {#if error.type === CompilationErrorType.Error}
                    <span>Errors in {fileName ? fileName : error.fqn}</span>
                {:else if error.type === CompilationErrorType.Skipped}
                    <span>Skipped {fileName ? fileName : error.fqn}</span>
                {/if}
            </div>
        </div>
        {#if expanded}
            {#if fileName}
                <span class="mb-2">{error.fqn}</span>
            {/if}

            {#if error.type === CompilationErrorType.Error}
                <div class="flex flex-col gap-2 text-sm">
                    {#each error.errors as errorMessage}
                        <!-- svelte-ignore a11y-click-events-have-key-events -->
                        <span
                            on:click={() => navigateToFile(asWakeErrorInfo(errorMessage))}
                            class="cursor-pointer hover:underline"
                            >{asWakeErrorInfo(errorMessage).message}</span
                        >
                    {/each}
                </div>
            {:else if error.type === CompilationErrorType.Skipped}
                <span>{asString(error.errors)}</span>
                <!-- {/if} -->
            {:else}
                <span>pipi</span>
            {/if}
        {/if}
    </TextContainer>
</div>
