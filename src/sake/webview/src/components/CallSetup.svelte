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
        type AccountStateData,
        type WakeSetBalancesRequestParams
    } from '../../shared/types';
    import { messageHandler } from '@estruyf/vscode/dist/client';
    import EtherValueInput from './EtherValueInput.svelte';
    import CopyButton from './icons/CopyButton.svelte';
    import { parseComplexNumber } from '../../shared/validate';
    import { displayEtherValue } from '../../shared/ether';

    provideVSCodeDesignSystem().register(vsCodeDropdown(), vsCodeOption(), vsCodeTextField());

    import { selectedValue, selectedAccount, accounts } from '../helpers/store';
    import { copyToClipboard, setBalance } from '../helpers/api';

    function handleAccountChange(event: any) {
        const _selectedAccountIndex = event.detail.value;

        if (
            _selectedAccountIndex === undefined ||
            _selectedAccountIndex < 0 ||
            _selectedAccountIndex >= $accounts.length
        ) {
            selectedAccount.set(undefined);
            return;
        }

        selectedAccount.set($accounts[_selectedAccountIndex]);
    }

    function handleValueChange(event: any) {
        // const _value = parseInt(event.target.value);
        const _value = event.target.value;
        if (isNaN(_value)) {
            selectedValue.set(undefined);
            return;
        }
        try {
            selectedValue.set(parseComplexNumber(_value));
        } catch (e) {
            const errorMessage = typeof e === 'string' ? e : (e as Error).message;
            messageHandler.send(
                WebviewMessage.onError,
                'Value could not be parsed: ' + errorMessage
            );
        }
    }

    async function topUp() {
        // @todo move this to commands
        if ($selectedAccount === undefined) {
            return;
        }

        const topUpValue = await messageHandler.request<string>(
            WebviewMessage.getTextFromInputBox,
            $selectedAccount.balance
        );

        if (topUpValue === undefined) {
            return;
        }

        let parsedTopUpValue;
        try {
            parsedTopUpValue = parseComplexNumber(topUpValue);
        } catch (e) {
            const errorMessage = typeof e === 'string' ? e : (e as Error).message;
            messageHandler.send(
                WebviewMessage.onError,
                'Value could not be parsed: ' + errorMessage
            );
            return;
        }

        const success = setBalance($selectedAccount.address, parsedTopUpValue);

        console.log('top up success', success);
    }
</script>

{#if accounts !== undefined}
    <section>
        <p class="ml-1 mb-2">Account</p>
        <vscode-dropdown position="below" class="w-full mb-2" on:change={handleAccountChange}>
            {#each $accounts as account, i}
                <vscode-option value={i}>Account {i}</vscode-option>
            {/each}
        </vscode-dropdown>

        {#if $selectedAccount !== undefined}
            <div class="w-full px-1 mb-3">
                <div class="w-full flex flex-row gap-1 items-center h-[20px]">
                    <span class="flex-1 truncate text-sm">{$selectedAccount.address}</span>
                    <!-- <span class="flex-1 truncate text-sm">{accounts[selectedAccountIndex].address}</span> -->
                    <CopyButton callback={() => copyToClipboard($selectedAccount.address)} />
                </div>
                <div class="w-full flex flex-row gap-1 items-center h-[20px]">
                    <span class="text-sm flex-1">{displayEtherValue($selectedAccount.balance)}</span
                    >
                    <!-- <span class="text-sm flex-1">{accounts[selectedAccountIndex].balance}ETH</span> -->
                    <IconButton callback={topUp}>+</IconButton>
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
                        value={$selectedValue}
                        on:change={handleValueChange}
                    ></vscode-text-field>
                    <!-- <EtherValueInput /> -->
                </div>
                <!-- <p>Value</p>
            <vscode-text-field placeholder="Value" class="w-full"></vscode-text-field> -->
            </div>
        {/if}
    </section>
{/if}
