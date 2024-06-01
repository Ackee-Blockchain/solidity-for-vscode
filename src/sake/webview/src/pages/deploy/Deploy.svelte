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
    import { StateId, WebviewMessage, type CompilationStateData, type CompiledContract, type WakeDeploymentRequestParams } from "../../../shared/types";

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
    let isValidSelection = selectedContractId !== null && selectedContractId >= 0 && selectedContractId < compiledContracts.length;
    let compiling = false;
    let dirtyCompilation = false;
    let callSetup: CallSetup;

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

        console.log("received message in deploy.svelte", event.data);

        switch (command) {
            case WebviewMessage.stateChanged:
                if (stateId == StateId.CompiledContracts) {
                    const _payload = payload as CompilationStateData;
                    console.log("received compiled contracts", payload);
                    compiledContracts = _payload.contracts;
                    if (selectedContractId == null || selectedContractId >= compiledContracts.length) {
                        selectedContractId = 0;
                    }
                    dirtyCompilation = _payload.dirty;
                    return;
                }

                break;
        }
    });

    const createRandomAddress = function() {
        return "0x" + Math.random().toString(16).slice(2)
    }

    const deploy = async function() {
        if (selectedContractId === null || selectedContractId >= compiledContracts.length) {
            console.error("invalid contract id", selectedContractId)
            messageHandler.send(WebviewMessage.onError, "An issue occurred while deploying the contract");
            return;
        }

        const _sender = callSetup.getSelectedAccount();
        if (_sender === undefined) {
            console.error("invalid sender", _sender)
            messageHandler.send(WebviewMessage.onError, "An issue occurred while deploying the contract");
            return;
        }

        console.log("selected contract", compiledContracts[selectedContractId]);

        const _selectedContract = compiledContracts[selectedContractId];
        const payload: WakeDeploymentRequestParams = {
            contract_fqn: _selectedContract.fqn,
            sender: _sender,
            calldata: "",
            value: 0
        }

        await messageHandler.send(WebviewMessage.onDeploy, payload)
    }

    const selectContract = (e: CustomEvent) => {
        selectedContractId = e.detail.value;
    }

</script>

<main>
    <p class="ml-1 text-sm">Compiler version</p>
    <vscode-dropdown position="below" class="w-full mb-3">
        <vscode-option>Auto-compile</vscode-option>
    </vscode-dropdown>

    <vscode-button class="w-full" on:click={compile} appearence={dirtyCompilation ? "primary" : "secondary"} disabled={compiling}>
        {compiling ? "Compiling..." : "Compile all"}
    </vscode-button>
    {#if dirtyCompilation}
        <div class="text-sm px-2 py-1 bg-gray-800 rounded relative top--2 text-center pt-2 pb-1" style="z-index:0;">Some files were changed since last compilation</div>
    {/if}



    <Divider />

    <CallSetup bind:this={callSetup}/>

    <section>
        <p class="ml-1 text-sm">Contract</p>
        <vscode-dropdown position="below" class="w-full" on:change={selectContract}>
            {#each compiledContracts as contract, i}
                <vscode-option value={i}>{contract.name}</vscode-option>
            {/each}
        </vscode-dropdown>
        <div class="my-4"></div>

        <vscode-button class="w-full" on:click={deploy} disabled={selectedContractId == null}>Deploy</vscode-button>
    </section>

</main>

<style global>
    @tailwind base;
    @tailwind components;
    @tailwind utilities;
</style>