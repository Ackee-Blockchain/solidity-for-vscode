<script lang="ts">
    import { CompilationIssueType } from '../../shared/state_types';
    import ErrorIcon from '../components/icons/ErrorIcon.svelte';
    import WarningIcon from '../components/icons/WarningIcon.svelte';
    import TextContainer from '../components/TextContainer.svelte';
    import { compileContracts } from '../helpers/api';
    import { compilationIssuesVisible } from '../helpers/stores';
    import { compilationState } from '../helpers/stores';

    let compiling = false;

    const compile = async () => {
        compiling = true;
        await compileContracts();
        compiling = false;
    };

    $: nErrors = $compilationState.issues.filter(
        (issue) => issue.type === CompilationIssueType.Error
    ).length;
    $: nWarnings = $compilationState.issues.filter(
        (issue) => issue.type === CompilationIssueType.Skipped
    ).length;
</script>

<section class="p-3">
    <!-- <p class="ml-1 text-sm">Compiler version</p>
    <vscode-dropdown position="below" class="w-full mb-3">
        <vscode-option>Auto-compile</vscode-option>
    </vscode-dropdown> -->

    <div class="flex flex-col gap-1">
        <div class="flex gap-1">
            <!-- svelte-ignore a11y-click-events-have-key-events -->
            <vscode-button class="flex-1" on:click={compile} disabled={compiling}>
                {compiling ? 'Compiling...' : 'Compile all'}
            </vscode-button>
            {#if $compilationState.issues.length > 0}
                <!-- svelte-ignore a11y-click-events-have-key-events -->
                <vscode-button
                    on:click={() => compilationIssuesVisible.set(!$compilationIssuesVisible)}
                    class="bg-vscodeInputBackground text-vscodeInputForeground"
                >
                    <div class="flex items-center gap-2">
                        {#if nErrors > 0}
                            <span class="flex items-center gap-1">
                                <span>{nErrors}</span>
                                <ErrorIcon />
                            </span>
                        {/if}
                        {#if nWarnings > 0}
                            <span class="flex items-center gap-1">
                                <span>{nWarnings}</span>
                                <WarningIcon />
                            </span>
                        {/if}
                    </div>
                </vscode-button>
            {/if}
        </div>
        <!-- svelte-ignore missing-declaration -->
        {#if $compilationState.dirty}
            <TextContainer classList="flex gap-1 items-center text-sm h-[26px] justify-center">
                <span class="truncate">Some files changed since last compilation</span>
            </TextContainer>
        {/if}
    </div>
</section>
