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
        CompilationIssue,
        Contract,
        ContractAbi,
        ContractFunction as ContractFunctionType,
        CompilationErrorSpecific
    } from '../../shared/types';
    import { CompilationIssueType } from '../../shared/types';
    import ContractFunction from './ContractFunction.svelte';
    import TextContainer from './TextContainer.svelte';
    import { navigateTo } from '../helpers/api';
    import ErrorIcon from './icons/ErrorIcon.svelte';
    import WarningIcon from './icons/WarningIcon.svelte';
    import ClickableSpan from './ClickableSpan.svelte';

    provideVSCodeDesignSystem().register(vsCodeButton(), vsCodeTextField());

    export let issue: CompilationIssue;
    let expanded: boolean = false;
    $: expandable = issue.errors.length > 0;
    $: fileName = issue.fqn.split('/').pop();

    const navigateToFile = (error: CompilationErrorSpecific, justToFile = false) => {
        navigateTo(
            error.path,
            justToFile ? undefined : error.startOffset,
            justToFile ? undefined : error.endOffset
        );
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
            {#if issue.type === CompilationIssueType.Error}
                <ErrorIcon />
            {:else if issue.type === CompilationIssueType.Skipped}
                <WarningIcon />
            {/if}

            <div class="flex col gap-1">
                <span>
                    {issue.type === CompilationIssueType.Error ? 'Errors in' : 'Skipped'}
                    <ClickableSpan
                        callback={() => {
                            navigateToFile(issue.errors[0], true);
                        }}>{fileName ? fileName : issue.fqn}</ClickableSpan
                    >
                </span>
            </div>
        </div>
        {#if expanded}
            <!-- {#if fileName}
                <span class="mb-2">{issue.fqn}</span>
            {/if} -->

            {#if issue.type === CompilationIssueType.Error}
                <div class="flex flex-col gap-2 text-sm">
                    {#each issue.errors as error}
                        <!-- svelte-ignore a11y-click-events-have-key-events -->
                        <ClickableSpan callback={() => navigateToFile(error)}
                            >{error.message}</ClickableSpan
                        >
                    {/each}
                </div>
            {:else if issue.type === CompilationIssueType.Skipped}
                <!-- svelte-ignore a11y-click-events-have-key-events -->
                <ClickableSpan callback={() => navigateToFile(issue.errors[0])}
                    >{issue.errors[0].message}</ClickableSpan
                >
            {/if}
        {/if}
    </TextContainer>
</div>
