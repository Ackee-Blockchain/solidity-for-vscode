<script lang="ts">
    import {
        provideVSCodeDesignSystem,
        vsCodeTextField,
        vsCodeDropdown,
        vsCodeOption
    } from '@vscode/webview-ui-toolkit';
    import IconButton from './IconButton.svelte';
    import CopyButton from './icons/CopyButton.svelte';
    import { parseComplexNumber } from '../../shared/validate';
    import { displayEtherValue } from '../../shared/ether';

    provideVSCodeDesignSystem().register(vsCodeDropdown(), vsCodeOption(), vsCodeTextField());

    import { selectedValue, selectedAccount, accounts } from '../helpers/store';
    import {
        copyToClipboard,
        getInputFromTopBar,
        setBalance,
        showErrorMessage
    } from '../helpers/api';

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
        if (_value === '' || _value === undefined) {
            selectedValue.set(undefined);
            return;
        }
        try {
            console.log('parsed value', parseComplexNumber(_value));
            selectedValue.set(parseComplexNumber(_value));
        } catch (e) {
            const errorMessage = typeof e === 'string' ? e : (e as Error).message;
            showErrorMessage('Value could not be parsed: ' + errorMessage);
        }
    }

    async function topUp() {
        if ($selectedAccount === undefined) {
            return;
        }

        const topUpValue = await getInputFromTopBar($selectedAccount.balance?.toString());

        if (topUpValue === undefined) {
            return;
        }

        let parsedTopUpValue;
        try {
            parsedTopUpValue = parseComplexNumber(topUpValue);
        } catch (e) {
            const errorMessage = typeof e === 'string' ? e : (e as Error).message;
            showErrorMessage('Value could not be parsed: ' + errorMessage);
            return;
        }

        setBalance($selectedAccount.address, parsedTopUpValue);
    }
</script>

{#if accounts !== undefined}
    <section class="flex flex-col gap-1">
        <div>
            <vscode-dropdown position="below" class="w-full mb-2" on:change={handleAccountChange}>
                {#each $accounts as account, i}
                    <vscode-option value={i} selected={account.address == $selectedAccount?.address}
                        >Account {i}</vscode-option
                    >
                {/each}
                <!-- @dev hack to display selected account -->
                <span slot="selected-value">
                    {$selectedAccount?.nick ?? $selectedAccount?.address}
                </span>
            </vscode-dropdown>

            {#if $selectedAccount !== undefined}
                <div class="w-full px-1 mb-3">
                    <div class="w-full flex flex-row gap-1 items-center h-[20px]">
                        <span class="flex-1 truncate text-sm">{$selectedAccount.address}</span>
                        <!-- <span class="flex-1 truncate text-sm">{accounts[selectedAccountIndex].address}</span> -->
                        <CopyButton callback={() => copyToClipboard($selectedAccount.address)} />
                    </div>
                    <div class="w-full flex flex-row gap-1 items-center h-[20px]">
                        <span class="text-sm flex-1"
                            >{displayEtherValue($selectedAccount.balance)}</span
                        >
                        <!-- <span class="text-sm flex-1">{accounts[selectedAccountIndex].balance}ETH</span> -->
                        <IconButton callback={topUp}>+</IconButton>
                    </div>
                </div>
            {/if}
        </div>

        <div class="w-full flex flex-row gap-3">
            <vscode-text-field
                placeholder="Value"
                class="w-full"
                value={$selectedValue}
                on:change={handleValueChange}
            >
                <span slot="end" class="flex justify-center align-middle leading-5">Ξ</span>
            </vscode-text-field>
        </div>
    </section>
{/if}
