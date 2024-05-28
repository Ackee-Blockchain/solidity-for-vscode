<script lang="ts">
    import { 
        provideVSCodeDesignSystem, 
        vsCodeTextField, 
        vsCodeDropdown,
        vsCodeOption,
    } from "@vscode/webview-ui-toolkit";
    import Spacer from "./Spacer.svelte";
    import IconButton from "./IconButton.svelte";

    provideVSCodeDesignSystem().register(
        vsCodeDropdown(),
        vsCodeOption(),
        vsCodeTextField(),
    );

    let accounts: Array<Account> = [
        { address: "0x5B38Da6a701c568545dCfcB03FcB875f56beddC4", balance: 100 },
        { address: "0xAb8483F64d9C6d1EcF9b849Ae677dD3315835cb2", balance: 50 },
        { address: "0xCA35b7d915458EF540aDe6068dFe2F44E8fa733c", balance: 20 },
    ]

    let selectedAccountIndex: number = 0;

    function handleAccountChange(event: any) {
        selectedAccountIndex = event.detail.value;
    }
</script>

<section>
    <p class="mb-2">Account</p>
    <vscode-dropdown position="below" class="w-full" on:change={handleAccountChange}>
        {#each accounts as account, i}
            <vscode-option value={i}>{account.address}</vscode-option>
        {/each}
    </vscode-dropdown>

    <Spacer />
 
    <div class="w-full">
        <div class="w-full flex flex-row gap-1 items-center">
            <span class="flex-1 truncate text-sm">{accounts[selectedAccountIndex].address}</span>
            <IconButton >
                <svg width="16" height="16" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg" fill="currentColor"><path fill-rule="evenodd" clip-rule="evenodd" d="M4 4l1-1h5.414L14 6.586V14l-1 1H5l-1-1V4zm9 3l-3-3H5v10h8V7z"/><path fill-rule="evenodd" clip-rule="evenodd" d="M3 1L2 2v10l1 1V2h6.414l-1-1H3z"/></svg>
            </IconButton>
        </div>
        <p class="text-sm">{accounts[selectedAccountIndex].balance}ETH</p>
    </div>
    

    <Spacer />

    <p>Gas limit</p>
    <vscode-text-field placeholder="Gas limit" class="w-full"></vscode-text-field>

    <Spacer />
    
    <p>Value</p>
    <vscode-text-field placeholder="Value" class="w-full"></vscode-text-field>
</section>
