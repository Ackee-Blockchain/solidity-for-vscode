<script lang="ts">
    import ClickableSpan from './ClickableSpan.svelte';
    import { parseComplexNumber } from '../../shared/validate';
    import { displayEtherValue } from '../../shared/ether';
    import InputIssueIndicator from './InputIssueIndicator.svelte';

    import {
        selectedValue,
        selectedValueString,
        selectedAccount,
        accounts
    } from '../helpers/store';
    import { getInputFromTopBar, setBalance, showErrorMessage } from '../helpers/api';
    import CopyableSpan from './CopyableSpan.svelte';

    function handleAccountChange(event: any) {
        const _selectedAccountIndex = event.detail.value;

        if (
            _selectedAccountIndex === undefined ||
            _selectedAccountIndex < 0 ||
            _selectedAccountIndex >= $accounts.length
        ) {
            selectedAccount.set(null);
            return;
        }

        selectedAccount.set($accounts[_selectedAccountIndex]);
    }

    function handleValueChange(event: any) {
        // const _value = parseInt(event.target.value);
        const _value = event.target.value;
        selectedValueString.set(_value ?? null);
    }

    async function topUp() {
        if ($selectedAccount === undefined) {
            return;
        }

        const topUpValue = await getInputFromTopBar(
            $selectedAccount!.balance?.toString(),
            'Update balance of account'
        );

        if (topUpValue === undefined || topUpValue.value === undefined) {
            return;
        }

        let parsedTopUpValue;
        try {
            parsedTopUpValue = parseComplexNumber(topUpValue.value);
        } catch (e) {
            const errorMessage = typeof e === 'string' ? e : (e as Error).message;
            showErrorMessage('Value could not be parsed: ' + errorMessage);
            return;
        }

        setBalance($selectedAccount!.address, parsedTopUpValue);
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

            {#if $selectedAccount !== null}
                <div class="w-full px-1 mb-3">
                    <div class="w-full flex flex-row gap-1 items-center h-[20px]">
                        <!-- <span class="flex-1 truncate text-sm">{$selectedAccount.address}</span> -->
                        <!-- <span class="flex-1 truncate text-sm">{accounts[selectedAccountIndex].address}</span> -->
                        <CopyableSpan
                            text={$selectedAccount.address}
                            className="flex-1 truncate text-sm"
                        />
                        <!-- <CopyButton callback={() => copyToClipboard($selectedAccount.address)} /> -->
                    </div>
                    <div class="w-full flex flex-row gap-1 items-center h-[20px]">
                        <ClickableSpan className="text-sm flex-1" callback={topUp}>
                            {displayEtherValue($selectedAccount.balance)}
                        </ClickableSpan>
                        <!-- <span class="text-sm flex-1">{accounts[selectedAccountIndex].balance}ETH</span> -->
                        <!-- <IconButton callback={topUp}>+</IconButton> -->
                    </div>
                </div>
            {/if}
        </div>

        <div class="w-full flex flex-row gap-3">
            <vscode-text-field
                placeholder="Value"
                class="w-full"
                value={$selectedValueString}
                on:change={handleValueChange}
            >
                <div slot="end" class="flex items-center">
                    {#if $selectedValue === null}
                        <InputIssueIndicator type="danger">
                            <span class="text-sm">Value could not be parsed</span>
                        </InputIssueIndicator>
                    {:else}
                        <span slot="end" class="flex justify-center align-middle leading-5">Ξ</span>
                    {/if}
                </div>
            </vscode-text-field>
        </div>
    </section>
{/if}
