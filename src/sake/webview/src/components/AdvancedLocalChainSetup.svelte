<script lang="ts">
    import { currentChain } from '../helpers/stores';
    import TextContainer from './TextContainer.svelte';
    import MultipleWindowsIcon from './icons/MultipleWindowsIcon.svelte';
    import BlankIcon from './icons/BlankIcon.svelte';
    import { openChainsQuickPick } from '../helpers/api';
    import { chainNavigator } from '../helpers/stores';
    import ExpandButton from './icons/ExpandButton.svelte';
    import DefaultButton from './icons/DefaultButton.svelte';
    import Divider from './Divider.svelte';
    import ClickableSpan from './ClickableSpan.svelte';
    import CloseIcon from './icons/CloseIcon.svelte';
    import type {
        CreateLocalChainRequest,
        NetworkConnectionConfiguration,
        NetworkCreationConfiguration
    } from '../../shared/types';
    import { writable, derived } from 'svelte/store';
    import ViewHeader from './common/ViewHeader.svelte';
    import SegmentedControl from './common/SegmentedControl.svelte';
    import ValidableTextInput from './common/ValidableTextInput.svelte';
    import { validateNonEmptyString } from '../helpers/validation';

    // export let form:
    //     | (NetworkCreationConfiguration & { displayName?: string })
    //     | NetworkConnectionConfiguration = {
    //     displayName: 'Local Chain'
    // };

    export let form: any;

    // let errors: Partial<
    //     Record<keyof (NetworkCreationConfiguration & { displayName?: string }), string>
    // > = {};

    // // Reactive statement for form validity
    // $: isValid = Object.values(errors).every((error) => error === null);

    // // Validate individual fields
    // function validateField(
    //     field: keyof (NetworkCreationConfiguration & { displayName?: string }),
    //     value: any
    // ): string | null {
    //     switch (field) {
    //         case 'accounts':
    //             if (value && (isNaN(value) || value < 0)) return 'Must be a positive number';
    //             break;
    //         case 'chainId':
    //             if (value && (isNaN(value) || value < 0)) return 'Must be a positive number';
    //             break;
    //         case 'minGasPrice':
    //             if (value && (isNaN(value) || value < 0)) return 'Must be a positive number';
    //             break;
    //         case 'blockBaseFeePerGas':
    //             if (value && (isNaN(value) || value < 0)) return 'Must be a positive number';
    //             break;
    //         case 'displayName':
    //             if (value && value.length === 0) return 'Must be a non-empty string';
    //             break;
    //     }
    //     return null;
    // }

    // // Enhanced form change handler
    // function createFormChangeHandler(property: keyof typeof form) {
    //     return (e: any) => {
    //         const value = e.target.value;
    //         form[property] = value;

    //         // Update errors object
    //         const error = validateField(property, value);
    //         errors = {
    //             ...errors,
    //             [property]: error
    //         };
    //     };
    // }

    $: console.log(form);
</script>

<!-- <ViewHeader>
    <span>Chain Status</span>
</ViewHeader> -->

<!-- @dev for proper typing -->
{#if $chainNavigator.state === 'advancedLocalChainSetup'}
    <div style="background:#2c2c2c" class="p-2">
        <div class="flex flex-col gap-2">
            <div class="flex flex-col gap-1">
                <ValidableTextInput
                    label="Display Name"
                    validate={validateNonEmptyString}
                    bind:value={form.displayName}
                />
            </div>

            <SegmentedControl
                selectedIndex={$chainNavigator.activeTab === 'create' ? 0 : 1}
                options={['Create new', 'Connect to existing']}
                on:change={(e) =>
                    chainNavigator.setActiveTab(e.detail === 0 ? 'create' : 'connect')}
            />

            <div class="flex flex-col gap-1">
                {#if $chainNavigator.activeTab === 'create'}
                    <!-- <ViewHeader>Create a new local chain</ViewHeader> -->

                    <div>
                        <span class="text-sm">Number of accounts</span>
                        <vscode-text-field
                            placeholder="0"
                            class="w-full"
                            value={form.accounts}
                            on:change={createFormChangeHandler('accounts')}
                        />
                        {#if errors.accounts}
                            <span class="text-xs text-red-500">{errors.accounts}</span>
                        {/if}
                    </div>

                    <div>
                        <span class="text-sm">Chain ID</span>
                        <vscode-text-field
                            placeholder="0"
                            class="w-full"
                            value={form.chainId}
                            on:change={createFormChangeHandler('chainId')}
                        />
                        {#if errors.chainId}
                            <span class="text-xs text-red-500">{errors.chainId}</span>
                        {/if}
                    </div>

                    <div>
                        <span class="text-sm">Fork</span>
                        <vscode-text-field
                            placeholder="Fork name"
                            class="w-full"
                            value={form.fork}
                            on:change={createFormChangeHandler('fork')}
                        />
                        {#if errors.fork}
                            <span class="text-xs text-red-500">{errors.fork}</span>
                        {/if}
                    </div>

                    <div>
                        <span class="text-sm">Hardfork</span>
                        <vscode-text-field
                            placeholder="Hardfork name"
                            class="w-full"
                            value={form.hardfork}
                            on:change={createFormChangeHandler('hardfork')}
                        />
                        {#if errors.hardfork}
                            <span class="text-xs text-red-500">{errors.hardfork}</span>
                        {/if}
                    </div>

                    <div>
                        <span class="text-sm">Minimum Gas Price</span>
                        <vscode-text-field
                            placeholder="0"
                            class="w-full"
                            value={form.minGasPrice}
                            on:change={createFormChangeHandler('minGasPrice')}
                        />
                        {#if errors.minGasPrice}
                            <span class="text-xs text-red-500">{errors.minGasPrice}</span>
                        {/if}
                    </div>

                    <div>
                        <span class="text-sm">Block Base Fee Per Gas</span>
                        <vscode-text-field
                            placeholder="0"
                            class="w-full"
                            value={form.blockBaseFeePerGas}
                            on:change={createFormChangeHandler('blockBaseFeePerGas')}
                        />
                        {#if errors.blockBaseFeePerGas}
                            <span class="text-xs text-red-500">{errors.blockBaseFeePerGas}</span>
                        {/if}
                    </div>
                {:else if $chainNavigator.activeTab === 'connect'}
                    <!-- <ViewHeader>Connect to existing chain</ViewHeader> -->

                    <div>
                        <span class="text-sm">URI Connection String</span>
                        <vscode-text-field
                            placeholder="0"
                            class="w-full"
                            value={form.uri}
                            on:change={createFormChangeHandler('uri')}
                        />
                        {#if errors.blockBaseFeePerGas}
                            <span class="text-xs text-red-500">{errors.blockBaseFeePerGas}</span>
                        {/if}
                    </div>
                {/if}
            </div>
        </div>
    </div>
{/if}
