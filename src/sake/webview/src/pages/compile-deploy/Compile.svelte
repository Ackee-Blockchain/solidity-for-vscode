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
    import Spacer from '../../components/Spacer.svelte';
    import Contract from '../../components/Contract.svelte';
    import Divider from '../../components/Divider.svelte';
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

    provideVSCodeDesignSystem().register(
        vsCodeButton(),
        vsCodeDropdown(),
        vsCodeOption(),
        vsCodeDivider(),
        vsCodeCheckbox(),
        vsCodeTextField()
    );

    let compiling = false;
    let dirtyCompilation = false;

    onMount(() => {
        messageHandler.send(WebviewMessage.getState, StateId.CompiledContracts);
    });

    const setCompilationState = (payload: CompilationStateData) => {
        dirtyCompilation = payload.dirty;
    };

    const compile = async () => {
        compiling = true;

        const success = await messageHandler.request<boolean>(WebviewMessage.onCompile);
        if (success) {
            dirtyCompilation = false;
        }

        compiling = false;
    };

    window.addEventListener('message', (event) => {
        if (!event.data.command) return;

        const { command, payload, stateId } = event.data;

        switch (command) {
            case WebviewMessage.getState:
                if (stateId == StateId.CompiledContracts) {
                    if (payload === undefined) {
                        return;
                    }
                    setCompilationState(payload as CompilationStateData);
                    return;
                }

                break;
        }
    });
</script>

<section>
    <!-- <p class="ml-1 text-sm">Compiler version</p>
    <vscode-dropdown position="below" class="w-full mb-3">
        <vscode-option>Auto-compile</vscode-option>
    </vscode-dropdown> -->

    <!-- svelte-ignore a11y-click-events-have-key-events -->
    <CallSetup />

    <vscode-button
        class="w-full"
        on:click={compile}
        appearence={dirtyCompilation ? 'primary' : 'secondary'}
        disabled={compiling}
    >
        {compiling ? 'Compiling...' : 'Compile all'}
    </vscode-button>
    {#if dirtyCompilation}
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
