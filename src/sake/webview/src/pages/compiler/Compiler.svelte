<script lang="ts">
    import {
        provideVSCodeDesignSystem,
        vsCodeButton,
        vsCodeDropdown,
        vsCodeOption,
        vsCodeDivider,
        vsCodeCheckbox
    } from "@vscode/webview-ui-toolkit";
    import Divider from "../../components/Divider.svelte";
    import Spacer from "../../components/Spacer.svelte";


    provideVSCodeDesignSystem().register(
        vsCodeButton(),
        vsCodeDropdown(),
        vsCodeOption(),
        vsCodeDivider(),
        vsCodeCheckbox()
    );

    window.addEventListener("message", (event) => {
        if (!event.data.command) return;

        const { command, payload } = event.data;

        switch (command) {
            case "onChangeActiveFile":
                if (payload === undefined) {
                    selectedFile = undefined;
                    return;
                }

                const fileName = payload.document.fileName.split('/').pop();
                selectedFile = fileName;
                break;
        }
    });

    let selectedFile: string | undefined;
</script>

<main>
    <section>
        <p class="mb-2">Compiler version</p>
        <vscode-dropdown position="below" class="w-full">
          <vscode-option>0.8.25</vscode-option>
          <vscode-option>0.8.24</vscode-option>
          <vscode-option>0.8.23</vscode-option>
        </vscode-dropdown>
    </section>
    <vscode-checkbox checked>Auto-compile</vscode-checkbox>
    <!-- <Divider />
    <section>
        <p class="mb-2">Compile file</p>
        <vscode-dropdown position="below" class="w-full">
          <vscode-option>0.8.25</vscode-option>
          <vscode-option>0.8.24</vscode-option>
          <vscode-option>0.8.23</vscode-option>
        </vscode-dropdown>
    </section> -->

    <Spacer />

    {#if selectedFile}
        <vscode-button class="w-full">Compile {selectedFile}</vscode-button>
    {:else}
        <vscode-button class="w-full" disabled>Open a file to compile</vscode-button>
    {/if}

    <Spacer />

    <vscode-button class="w-full" appearance="secondary">Compile all</vscode-button>
</main>

<style global>
    @tailwind base;
    @tailwind components;
    @tailwind utilities;
</style>