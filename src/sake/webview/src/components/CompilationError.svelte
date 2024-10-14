<script lang="ts">
    import IconSpacer from './icons/IconSpacer.svelte';
    import ExpandButton from './icons/ExpandButton.svelte';
    import type { CompilationIssue, CompilationErrorSpecific } from '../../shared/types';
    import { CompilationIssueType } from '../../shared/types';
    import TextContainer from './TextContainer.svelte';
    import { navigateTo } from '../helpers/api';
    import ErrorIcon from './icons/ErrorIcon.svelte';
    import WarningIcon from './icons/WarningIcon.svelte';
    import ClickableSpan from './ClickableSpan.svelte';

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
    <TextContainer
        classList="w-full flex flex-col gap-2 overflow-hidden {expanded ? '' : 'h-[26px]'}"
    >
        <div class="flex gap-2">
            <span class="w-[16px]">
                {#if issue.type === CompilationIssueType.Error}
                    <ErrorIcon />
                {:else if issue.type === CompilationIssueType.Skipped}
                    <WarningIcon />
                {/if}
            </span>
            <p class="relative top-[-2px] {expanded ? '' : 'truncate'}">
                {issue.type === CompilationIssueType.Error ? 'Errors in' : 'Skipped'}
                <ClickableSpan
                    callback={() => {
                        navigateToFile(issue.errors[0], true);
                    }}>{fileName ? fileName : issue.fqn}</ClickableSpan
                >
            </p>
        </div>

        {#if expanded}
            <!-- {#if fileName}
                <span class="mb-2">{issue.fqn}</span>
            {/if} -->
            <div class="flex flex-col gap-2 text-sm">
                {#if issue.type === CompilationIssueType.Error}
                    {#each issue.errors as error}
                        <!-- svelte-ignore a11y-click-events-have-key-events -->
                        <ClickableSpan callback={() => navigateToFile(error)}
                            >{error.message}</ClickableSpan
                        >
                    {/each}
                {:else if issue.type === CompilationIssueType.Skipped}
                    <!-- svelte-ignore a11y-click-events-have-key-events -->

                    <ClickableSpan callback={() => navigateToFile(issue.errors[0])}
                        >{issue.errors[0].message}</ClickableSpan
                    >
                {/if}
            </div>
        {/if}
    </TextContainer>
</div>
