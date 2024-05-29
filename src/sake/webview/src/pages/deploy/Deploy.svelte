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
    import { StateId, WebviewMessage, type CompilationStateData, type CompiledContract } from "../../../shared/types";

    provideVSCodeDesignSystem().register(
        vsCodeButton(),
        vsCodeDropdown(),
        vsCodeOption(),
        vsCodeDivider(),
        vsCodeCheckbox(),
        vsCodeTextField(),
    );

    let compiledContracts: Array<CompiledContract> = [];
    let selectedContractId: number | null = null;

    window.addEventListener("message", (event) => {
        if (!event.data.command) return;

        const { command, payload, stateId } = event.data;

        console.log("received message in compiler.svelte", event.data);

        switch (command) {
            case WebviewMessage.stateChanged:
                if (stateId == StateId.CompiledContracts) {
                    compiledContracts = (payload as CompilationStateData).contracts;
                }
                break;
        }
    });

    const createRandomAddress = function() {
        return "0x" + Math.random().toString(16).slice(2)
    }

    const deploy = async function() {
        // const contractAbi = await messageHandler.request<any>("getSampleContractAbi");
        // const contract = {
        //     name: "MagicCoin",
        //     address: createRandomAddress(),
        //     abi: contractAbi
        // }

        if (selectedContractId === null || selectedContractId >= compiledContracts.length) {
            console.error("invalid contract id", selectedContractId)
            messageHandler.send(WebviewMessage.onError, "An issue occurred while deploying the contract");
            return;
        }

        const _selectedContract = compiledContracts[selectedContractId];

        const success = await messageHandler.request(WebviewMessage.onDeploy, _selectedContract)
        // const success = await messageHandler.request(WebviewMessage.onDeploy, selectedContract)
    }

</script>

<main>
    <CallSetup />

    <vscode-divider class="my-4"></vscode-divider>

    <section>
        <p class="mb-2">Contract</p>
        <vscode-dropdown position="below" class="w-full" on:change={e => {
            selectedContract = e.detail.value;
        }}>
            {#each compiledContracts as contract, i}
                <vscode-option value={i}>{contract.name}</vscode-option>
            {/each}
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