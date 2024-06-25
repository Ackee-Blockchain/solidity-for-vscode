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
    import { compilationState } from '../../helpers/store';

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

    <!-- svelte-ignore a11y-click-events-have-key-events -->
    <vscode-button
        class="w-full"
        on:click={compile}
        appearence={$compilationState.dirty ? 'primary' : 'secondary'}
        disabled={compiling}
    >
        {compiling ? 'Compiling...' : 'Compile all'}
    </vscode-button>
    {#if $compilationState.dirty}
        <div
            class="text-sm px-2 py-1 bg-gray-800 rounded relative top--2 text-center pt-2 pb-1"
            style="z-index:0;"
        >
            Some files were changed since last compilation
        </div>
    {/if}
</section>

<style global>
    @tailwind base;
    @tailwind components;
    @tailwind utilities;
</style>
