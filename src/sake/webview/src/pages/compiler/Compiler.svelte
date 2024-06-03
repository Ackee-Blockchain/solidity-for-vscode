<script lang="ts">
    import {
        provideVSCodeDesignSystem,
        vsCodeButton,
    } from "@vscode/webview-ui-toolkit";
    import { messageHandler } from '@estruyf/vscode/dist/client'
    import { StateId, WebviewMessage, type CompilationStateData } from "../../../shared/types";

    provideVSCodeDesignSystem().register(
        vsCodeButton(),
    );

    let compiling = false;
    let dirtyCompilation = false;

    const compile = async () => {
        compiling = true;

        const success = await messageHandler.request<boolean>(WebviewMessage.onCompile);
        if (success) {
            dirtyCompilation = false;
        }

        compiling = false;
    }

    window.addEventListener("message", (event) => {
        if (!event.data.command) return;

        const { command, payload, stateId } = event.data;

        switch (command) {
            case WebviewMessage.getState:
                if (stateId == StateId.CompiledContracts) {
                    dirtyCompilation = (payload as CompilationStateData).dirty;
                }
                break;
        }
    });
</script>

<main>
    <!-- svelte-ignore a11y-click-events-have-key-events -->
    <vscode-button class="w-full" on:click={compile} appearence={dirtyCompilation ? "primary" : "secondary"} disabled={compiling}>
        {compiling ? "Compiling..." : "Compile all"}
    </vscode-button>
    {#if dirtyCompilation}
        <div class="text-sm px-2 py-1 bg-gray-800 rounded relative top-[-2px]">Some files were changed, recompilation might be needed</div>
    {/if}
</main>

<style global>
    @tailwind base;
    @tailwind components;
    @tailwind utilities;
</style>