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
    import Contract from "../../components/Contract.svelte";
    import Divider from "../../components/Divider.svelte";
    import CallSetup from "../../components/CallSetup.svelte";
    import { StateId, WebviewMessage, type WakeFunctionCallRequestParams } from "../../../shared/types";
    import { onMount } from "svelte";
    import { messageHandler } from "@estruyf/vscode/dist/client";
    // import '../../../shared/types'; // Importing types to avoid TS error

    provideVSCodeDesignSystem().register(
        vsCodeButton(),
        vsCodeDropdown(),
        vsCodeOption(),
        vsCodeDivider(),
        vsCodeCheckbox(),
        vsCodeTextField(),
    );

    let deployedContracts: Array<any> = [];
    let callSetup: CallSetup;

    onMount(() => {
        messageHandler.send(WebviewMessage.getState, StateId.DeployedContracts);
    });

    window.addEventListener("message", (event) => {
        if (!event.data.command) return;

        const { command, payload, stateId } = event.data;

        switch (command) {
            case WebviewMessage.getState: {
                if (stateId === StateId.DeployedContracts) {
                    deployedContracts = payload;
                }

                break;
            }
        }

    });

    const call = async function(calldata: string, contract_address: string) {

        const _sender: string | undefined = callSetup.getSelectedAccount();
        if (_sender === undefined) {
            messageHandler.send(WebviewMessage.onError, "Failed deployment, undefined sender");
            return;
        }

        const _value: number | undefined = callSetup.getValue();

        const payload: WakeFunctionCallRequestParams = {
            contract_address: contract_address,
            sender: _sender,
            calldata: calldata,
            value: _value ?? 0
        }

        await messageHandler.send(WebviewMessage.onContractFunctionCall, payload)
    }

</script>

<main>
    <CallSetup bind:this={callSetup}/>

    <Divider />

    <section>
        <p class="mb-2">Deployed Contracts</p>
        {#each deployedContracts as contract, i}
            {#if i > 0}
                <Divider />
            {/if}
            <Contract {contract} onFunctionCall={call}/>
        {/each}
    </section>

</main>

<style global>
    @tailwind base;
    @tailwind components;
    @tailwind utilities;
</style>