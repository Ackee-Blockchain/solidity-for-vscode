<script lang="ts">
    import {
        provideVSCodeDesignSystem,
        vsCodeTextField,
        vsCodeDropdown,
        vsCodeOption
    } from '@vscode/webview-ui-toolkit';
    import Spacer from './Spacer.svelte';
    import IconButton from './IconButton.svelte';
    import { onMount } from 'svelte';
    import {
        StateId,
        WebviewMessage,
        type Account,
        type AccountStateData
    } from '../../shared/types';
    import { messageHandler } from '@estruyf/vscode/dist/client';

    provideVSCodeDesignSystem().register(vsCodeDropdown(), vsCodeOption(), vsCodeTextField());

    let accounts: AccountStateData[];
    let value: number | undefined;
    let selectedAccount: AccountStateData | undefined;

    onMount(() => {
        messageHandler.send(WebviewMessage.onGetAccounts);
    });

    window.addEventListener('message', (event) => {
        if (!event.data.command) return;

        const { command, payload, stateId } = event.data;

        switch (command) {
            case WebviewMessage.getState:
                if (stateId == StateId.Accounts) {
                    const _payload = payload as AccountStateData[];
                    accounts = _payload;

                    // if no accounts, reset selected account
                    if (accounts.length === 0) {
                        selectedAccount = undefined;
                        return;
                    }

                    // check if selected account is still in the list, if not select the first account
                    if (
                        selectedAccount !== undefined &&
                        !accounts.some((account) => account.address === selectedAccount!.address)
                    ) {
                        selectedAccount = accounts[0];
                    }

                    if (selectedAccount === undefined) {
                        selectedAccount = accounts[0];
                    }

                    console.log('accounts', accounts);

                    return;
                }

                break;
        }
    });
    function handleAccountChange(event: any) {
        const _selectedAccountIndex = event.detail.value;

        if (
            _selectedAccountIndex === undefined ||
            _selectedAccountIndex < 0 ||
            _selectedAccountIndex >= accounts.length
        ) {
            selectedAccount = undefined;
            return;
        }

        selectedAccount = accounts[_selectedAccountIndex];
    }

    function handleValueChange(event: any) {
        const _value = parseInt(event.target.value);
        if (isNaN(_value)) {
            value = undefined;
            return;
        }
        value = _value;
    }

    export function getSelectedAccount(): AccountStateData | undefined {
        return selectedAccount;
    }

    export function getValue(): number | undefined {
        return value;
    }
</script>

{#if accounts !== undefined}
    <section>
        <p class="ml-1 mb-2">Account</p>
        <vscode-dropdown position="below" class="w-full mb-2" on:change={handleAccountChange}>
            {#each accounts as account, i}
                <vscode-option value={i}>Account {i}</vscode-option>
            {/each}
        </vscode-dropdown>

        {#if selectedAccount !== undefined}
            <div class="w-full px-1 mb-3">
                <div class="w-full flex flex-row gap-1 items-center h-[20px]">
                    <span class="flex-1 truncate text-sm">{selectedAccount.address}</span>
                    <!-- <span class="flex-1 truncate text-sm">{accounts[selectedAccountIndex].address}</span> -->
                    <IconButton>
                        <svg
                            width="16"
                            height="16"
                            viewBox="0 0 16 16"
                            xmlns="http://www.w3.org/2000/svg"
                            fill="currentColor"
                            ><path
                                fill-rule="evenodd"
                                clip-rule="evenodd"
                                d="M4 4l1-1h5.414L14 6.586V14l-1 1H5l-1-1V4zm9 3l-3-3H5v10h8V7z"
                            /><path
                                fill-rule="evenodd"
                                clip-rule="evenodd"
                                d="M3 1L2 2v10l1 1V2h6.414l-1-1H3z"
                            /></svg
                        >
                    </IconButton>
                </div>
                <div class="w-full flex flex-row gap-1 items-center h-[20px]">
                    <span class="text-sm flex-1">{selectedAccount.balance}</span>
                    <!-- <span class="text-sm flex-1">{accounts[selectedAccountIndex].balance}ETH</span> -->
                    <IconButton>+</IconButton>
                </div>
            </div>

            <div class="w-full flex flex-row gap-3">
                <!-- <div>
                <p class="ml-1 text-sm">Gas limit</p>
                <vscode-text-field placeholder="Gas limit" class="w-full"></vscode-text-field>
            </div> -->
                <div>
                    <p class="ml-1 text-sm">Value</p>
                    <vscode-text-field
                        placeholder="Value"
                        class="w-full"
                        {value}
                        on:change={handleValueChange}
                    ></vscode-text-field>
                </div>
                <!-- <p>Value</p>
            <vscode-text-field placeholder="Value" class="w-full"></vscode-text-field> -->
            </div>
        {/if}
    </section>
{/if}
