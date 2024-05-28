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
    import { StateId, Message } from "../../../shared/types";
    // import '../../../shared/types'; // Importing types to avoid TS error

    provideVSCodeDesignSystem().register(
        vsCodeButton(),
        vsCodeDropdown(),
        vsCodeOption(),
        vsCodeDivider(),
        vsCodeCheckbox(),
        vsCodeTextField(),
    );

    let deployedContracts: Array<any> = [
        // {
        //     name: "MagicCoin",
        //     address: "0x5B38Da6a701c568545dCfcB03FcB875f56beddC4",
        //     abi: sampleContractAbi
        // },
        // {
        //     name: "NotMagicCoin",
        //     address: "0xAb8483F64d9C6d1EcF9b849Ae677dD3315835cb2",
        //     abi: sampleContractAbi

        // }
    ];

    window.addEventListener("message", (event) => {
        if (!event.data.command) return;

        const { command, payload, stateId } = event.data;

        switch (command) {
            case Message.onDeployContract:
                if (payload === undefined) {
                    return;
                }

                deployedContracts = [...deployedContracts, payload];
                break;

            case "stateUpdated": {
                if (stateId === StateId.DeployedContracts) {
                    deployedContracts = payload;
                }

                // deployedContracts = payload;
                break;
            }
        }

    });

</script>

<main>fn
    <CallSetup />

    <vscode-divider class="my-4"></vscode-divider>

    <section>
        <p class="mb-2">Deployed Contracts</p>
        {#each deployedContracts as contract, i}
            {#if i > 0}
                <Divider />
            {/if}
            <Contract {contract}/>
        {/each}
    </section>

</main>

<style global>
    @tailwind base;
    @tailwind components;
    @tailwind utilities;
</style>