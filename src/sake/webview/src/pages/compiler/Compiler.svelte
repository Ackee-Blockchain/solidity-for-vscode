<script lang="ts">
    import {
        provideVSCodeDesignSystem,
        vsCodeButton,
    } from "@vscode/webview-ui-toolkit";
    import { messageHandler } from '@estruyf/vscode/dist/client'
    import { WebviewMessage } from "../../../shared/types";

    provideVSCodeDesignSystem().register(
        vsCodeButton(),
    );

    let compiling = false;

    const compile = async () => {
        compiling = true;
        await messageHandler.send(WebviewMessage.onInfo, "mnm");
        await messageHandler.send(WebviewMessage.onCompileAll);
        compiling = false;
    }
</script>

<main>
    <vscode-button class="w-full" on:click={compile}>
        {compiling ? "Compiling..." : "Compile contracts"}
    </vscode-button>
</main>

<style global>
    @tailwind base;
    @tailwind components;
    @tailwind utilities;
</style>