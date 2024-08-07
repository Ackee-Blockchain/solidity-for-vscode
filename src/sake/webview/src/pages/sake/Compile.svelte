<script lang="ts">
    import {
        provideVSCodeDesignSystem,
        vsCodeButton,
        vsCodeDropdown,
        vsCodeOption,
        vsCodeDivider,
        vsCodeCheckbox,
        vsCodeTextField
    } from '@vscode/webview-ui-toolkit';
    import CallSetup from '../../components/CallSetup.svelte';
    import { messageHandler } from '@estruyf/vscode/dist/client';
    import {
        StateId,
        WebviewMessage,
        type CompilationStateData,
        type CompiledContract,
        type WakeDeploymentRequestParams
    } from '../../../shared/types';
    import { onMount } from 'svelte';
    import Constructor from '../../components/Constructor.svelte';
    import { compilationIssuesVisible, compilationState } from '../../helpers/store';
    import TextContainer from '../../components/TextContainer.svelte';
    import WarningIcon from '../../components/icons/WarningIcon.svelte';
    import ErrorIcon from '../../components/icons/ErrorIcon.svelte';
    import { Warning } from 'postcss';
    import TextContainerDark from '../../components/TextContainerDark.svelte';

    provideVSCodeDesignSystem().register(
        vsCodeButton(),
        vsCodeDropdown(),
        vsCodeOption(),
        vsCodeDivider(),
        vsCodeCheckbox(),
        vsCodeTextField()
    );

    let compiling = false;

    const compile = async () => {
        compiling = true;
        await messageHandler.request<boolean>(WebviewMessage.onCompile);
        compiling = false;
    };
</script>

<section>
    <!-- <p class="ml-1 text-sm">Compiler version</p>
    <vscode-dropdown position="below" class="w-full mb-3">
        <vscode-option>Auto-compile</vscode-option>
    </vscode-dropdown> -->

    <div class="flex flex-col gap-2">
        <div class="flex gap-2">
            <!-- svelte-ignore a11y-click-events-have-key-events -->
            <vscode-button class="flex-1" on:click={compile} disabled={compiling}>
                {compiling ? 'Compiling...' : 'Compile all'}
            </vscode-button>
            {#if $compilationState.errors.length > 0}
                <!-- svelte-ignore a11y-click-events-have-key-events -->
                <vscode-button
                    on:click={() => compilationIssuesVisible.set(true)}
                    class="bg-vscodeButtonSecondary text-vscodeButtonSecondary"
                >
                    <ErrorIcon />
                    <span>{$compilationState.errors.length}</span>
                </vscode-button>
            {/if}
        </div>
        {#if $compilationState.dirty}
            <TextContainer classList="flex gap-1 items-center text-sm h-[26px] justify-center">
                <span class="truncate">Some files changed since last compilation</span>
            </TextContainer>
        {/if}
    </div>
</section>
