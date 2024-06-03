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
    import { onMount } from "svelte";
  import Constructor from "../../components/Constructor.svelte";

    provideVSCodeDesignSystem().register(
        vsCodeButton(),
        vsCodeDropdown(),
        vsCodeOption(),
        vsCodeDivider(),
        vsCodeCheckbox(),
        vsCodeTextField(),
    );

    let compiledContracts: Array<CompiledContract> = [];
    let selectedContract: CompiledContract | undefined = undefined;
    let compiling = false;
    let dirtyCompilation = false;
    let callSetup: CallSetup;

    onMount(() => {
        messageHandler.send(WebviewMessage.getState, StateId.CompiledContracts);
    });

    const setCompilationState = (payload: CompilationStateData) => {
        compiledContracts = payload.contracts;
        if (selectedContract === undefined && compiledContracts.length > 0) {
            selectedContract = compiledContracts[0];
        }
        dirtyCompilation = payload.dirty;
    }

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
            case WebviewMessage.stateChanged:
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

    const createRandomAddress = function() {
        return "0x" + Math.random().toString(16).slice(2)
    }

    const deploy = async function(calldata: string) {
        if (selectedContract === undefined) {
            messageHandler.send(WebviewMessage.onError, "Failed deployment, no contract seleced");
            return;
        }

        const _sender: string | undefined = callSetup.getSelectedAccount();
        if (_sender === undefined) {
            messageHandler.send(WebviewMessage.onError, "Failed deployment, undefined sender");
            return;
        }

        const _value: number | undefined = callSetup.getValue();

        const payload: WakeDeploymentRequestParams = {
            contract_fqn: selectedContract.fqn,
            sender: _sender,
            calldata: calldata,
            value: _value ?? 0
        }

        await messageHandler.send(WebviewMessage.onDeploy, payload)
    }

    const selectContract = function(e: CustomEvent) {
        // console.log("selected contract id", e.detail.value);

        const _selectedContractId = e.detail.value;
        if (_selectedContractId == null || _selectedContractId >= compiledContracts.length) {
            selectedContract = undefined;
        } else {
            selectedContract = compiledContracts[_selectedContractId];
        }

        // console.log("selected contract", selectedContract);
    }

</script>

<main>
    <p class="ml-1 text-sm">Compiler version</p>
    <vscode-dropdown position="below" class="w-full mb-3">
        <vscode-option>Auto-compile</vscode-option>
    </vscode-dropdown>

    <!-- svelte-ignore a11y-click-events-have-key-events -->
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

        {#if selectedContract !== undefined}
            <Constructor abi={selectedContract.abi} onDeploy={deploy}/>
        {/if}

        <!-- svelte-ignore a11y-click-events-have-key-events -->

    </section>

</main>

<style global>
    @tailwind base;
    @tailwind components;
    @tailwind utilities;
</style>