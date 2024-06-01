<script lang="ts">
    import {
        provideVSCodeDesignSystem,
        vsCodeTextField,
        vsCodeDropdown,
        vsCodeOption,
    } from "@vscode/webview-ui-toolkit";
    import Spacer from "./Spacer.svelte";
    import IconButton from "./IconButton.svelte";
    import { onMount } from 'svelte';
    import { StateId, WebviewMessage, type Account, type AccountStateData } from "../../shared/types";
    import { messageHandler } from '@estruyf/vscode/dist/client'

    provideVSCodeDesignSystem().register(
        vsCodeDropdown(),
        vsCodeOption(),
        vsCodeTextField(),
    );

    export const getSelectedAccount = () => {
        if (selectedAccountIndex === undefined) return undefined;
        return accounts[selectedAccountIndex];
    }

    let accounts: AccountStateData = [
        // { address: "0x5B38Da6a701c568545dCfcB03FcB875f56beddC4", balance: 100 },
        // { address: "0xAb8483F64d9C6d1EcF9b849Ae677dD3315835cb2", balance: 50 },
        // { address: "0xCA35b7d915458EF540aDe6068dFe2F44E8fa733c", balance: 20 },
    ]

    onMount(() => {
        messageHandler.send(WebviewMessage.onGetAccounts);
    });

    window.addEventListener("message", (event) => {
        if (!event.data.command) return;

        const { command, payload, stateId } = event.data;

        console.log("received message in callsetup.svelte", event.data);

        switch (command) {
            case WebviewMessage.stateChanged:
                if (stateId == StateId.Accounts) {
                    const _payload = payload as AccountStateData;
                    console.log("received accounts", payload);
                    accounts = _payload;
                    return;
                }

                break;
        }
    });

    let selectedAccountIndex: number | undefined = undefined

    function handleAccountChange(event: any) {
        selectedAccountIndex = event.detail.value;
    }
</script>

<section>
    <p class="ml-1 mb-2">Account</p>
    <vscode-dropdown position="below" class="w-full mb-2" on:change={handleAccountChange}>
        {#each accounts as account, i}
            <vscode-option value={i}>Account {i}</vscode-option>
        {/each}
    </vscode-dropdown>

    {#if selectedAccountIndex === undefined}
        <!-- <p class="ml-1 text-sm">No account selected</p> -->
    {:else}
    <div class="w-full px-1 mb-3">
        <div class="w-full flex flex-row gap-1 items-center h-[20px]">
            <span class="flex-1 truncate text-sm">TODO</span>
            <!-- <span class="flex-1 truncate text-sm">{accounts[selectedAccountIndex].address}</span> -->
            <IconButton >
                <svg width="16" height="16" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg" fill="currentColor"><path fill-rule="evenodd" clip-rule="evenodd" d="M4 4l1-1h5.414L14 6.586V14l-1 1H5l-1-1V4zm9 3l-3-3H5v10h8V7z"/><path fill-rule="evenodd" clip-rule="evenodd" d="M3 1L2 2v10l1 1V2h6.414l-1-1H3z"/></svg>
            </IconButton>
        </div>
        <div class="w-full flex flex-row gap-1 items-center h-[20px]">
            <span class="text-sm flex-1">TODO</span>
            <!-- <span class="text-sm flex-1">{accounts[selectedAccountIndex].balance}ETH</span> -->
            <IconButton >
                +
            </IconButton>
        </div>
    </div>
    {/if}

    <div class="w-full flex flex-row gap-3 ">
        <div>
            <p class="ml-1 text-sm">Gas limit</p>
            <vscode-text-field placeholder="Gas limit" class="w-full"></vscode-text-field>
        </div>
        <div>
            <p class="ml-1 text-sm">Value</p>
            <vscode-text-field placeholder="Value" class="w-full"></vscode-text-field>
        </div>
        <!-- <p>Value</p>
        <vscode-text-field placeholder="Value" class="w-full"></vscode-text-field> -->
    </div>

</section>
