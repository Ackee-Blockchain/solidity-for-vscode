<script lang="ts">
    import {
        provideVSCodeDesignSystem,
        vsCodeButton,
        vsCodeDropdown,
        vsCodeOption,
        vsCodeDivider,
        vsCodeCheckbox,
        vsCodeTextField,
    } from "@vscode/webview-ui-toolkit";
    import Spacer from "../../components/Spacer.svelte";
    import Contract from "../../components/Contract.svelte";
    import Divider from "../../components/Divider.svelte";
    import CallSetup from "../../components/CallSetup.svelte";
    import { messageHandler } from '@estruyf/vscode/dist/client'

    provideVSCodeDesignSystem().register(
        vsCodeButton(),
        vsCodeDropdown(),
        vsCodeOption(),
        vsCodeDivider(),
        vsCodeCheckbox(),
        vsCodeTextField(),
    );

    window.addEventListener("message", (event) => {
        if (!event.data.command) return;

        const { command, payload, stateId } = event.data;
    });

    const createRandomAddress = function() {
        return "0x" + Math.random().toString(16).slice(2)
    }

    const deploy = async function() {
        const contractAbi = await messageHandler.request<any>("getSampleContractAbi");
        const contract = {
            name: "MagicCoin",
            address: createRandomAddress(),
            abi: contractAbi
        }
        await messageHandler.send("deployContract", contract)
    }

</script>

<main>
    <CallSetup />

    <vscode-divider class="my-4"></vscode-divider>

    <section>
        <p class="mb-2">Contract</p>
        <vscode-dropdown position="below" class="w-full">
            <vscode-option>MagicCoin</vscode-option>
            <vscode-option>NotMagicCoin</vscode-option>
        </vscode-dropdown>
        <div class="my-4"></div>

        <vscode-button class="w-full" on:click={deploy}>Deploy</vscode-button>
    </section>

</main>

<style global>
    @tailwind base;
    @tailwind components;
    @tailwind utilities;
</style>