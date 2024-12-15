<script lang="ts">
    import { chainNavigator } from '../helpers/stores';
    import SegmentedControl from './common/SegmentedControl.svelte';
    import ValidableTextInput from './common/ValidableTextInput.svelte';
    import { validateNonEmptyString, validateNumber } from '../helpers/validation';
    import DefaultButton from './icons/DefaultButton.svelte';
    import { connectToLocalChain, createNewLocalChain } from '../helpers/api';

    // export let form:
    //     | (NetworkCreationConfiguration & { displayName?: string })
    //     | NetworkConnectionConfiguration = {
    //     displayName: 'Local Chain'
    // };

    export let form = {
        displayName: 'Local Chain',
        accounts: undefined,
        chainId: undefined,
        fork: undefined,
        hardfork: undefined,
        minGasPrice: undefined,
        blockBaseFeePerGas: undefined,
        uri: undefined
    };

    let displayNameInput: ValidableTextInput;

    let loading = false;

    const processChainSetup = async (chainSetup: () => Promise<boolean>) => {
        loading = true;
        await chainSetup().then((success) => {
            if (success) {
                chainNavigator.clear();
            }
        });
        loading = false;
    };

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
</script>

<!-- <ViewHeader>
    <span>Chain Status</span>
</ViewHeader> -->

<!-- @dev for proper typing -->
{#if $chainNavigator.state === 'advancedLocalChainSetup'}
    <div class="p-2">
        <!-- TODO: remove hardcoded background color -->
        <div class="flex flex-col gap-3">
            <div class="flex flex-col gap-1">
                <ValidableTextInput
                    label="Display Name"
                    validate={validateNonEmptyString}
                    autofocus={true}
                    bind:value={form.displayName}
                />
            </div>

            <SegmentedControl
                selectedIndex={$chainNavigator.activeTab === 'create' ? 0 : 1}
                options={['Create new', 'Connect to existing']}
                on:change={(e) =>
                    chainNavigator.setActiveTab(e.detail === 0 ? 'create' : 'connect')}
            />

            {#if $chainNavigator.activeTab === 'create'}
                <!-- <ViewHeader>Create a new local chain</ViewHeader> -->
                <div class="flex flex-col gap-1">
                    <ValidableTextInput
                        label="Number of accounts"
                        validate={validateNumber}
                        tooltip="The number of accounts to be created on the chain. The default is 10."
                        placeholder="10"
                        bind:value={form.accounts}
                    />

                    <ValidableTextInput
                        label="Chain ID"
                        validate={validateNumber}
                        tooltip="Chain ID is the identifier of the chain. Ethereum Mainnet has a chain ID of 1."
                        placeholder="1"
                        bind:value={form.chainId}
                    />

                    <ValidableTextInput
                        label="Fork URL"
                        validate={validateNonEmptyString}
                        tooltip="The fork URL is the URL of the Ethereum node to fork from. This can be an Alchemy, Infura, or any other Ethereum node provider."
                        placeholder="https://eth-mainnet.g.alchemy.com/v2/<api-key>"
                        bind:value={form.fork}
                    />

                    <ValidableTextInput
                        label="Hardfork"
                        tooltip="The hardfork to be used in the chain. The default is 'latest'."
                        placeholder="latest"
                        validate={validateNonEmptyString}
                        bind:value={form.hardfork}
                    />

                    <ValidableTextInput
                        label="Minimum Gas Price"
                        placeholder="0"
                        validate={validateNumber}
                        bind:value={form.minGasPrice}
                    />

                    <ValidableTextInput
                        label="Block Base Fee Per Gas"
                        placeholder="0"
                        validate={validateNumber}
                        bind:value={form.blockBaseFeePerGas}
                    />
                </div>

                <!-- svelte-ignore a11y-click-events-have-key-events -->
                <vscode-button
                    appearance="primary"
                    disabled={loading}
                    on:click={() =>
                        processChainSetup(() =>
                            createNewLocalChain(form.displayName, {
                                accounts: form.accounts,
                                chainId: form.chainId,
                                fork: form.fork,
                                hardfork: form.hardfork,
                                minGasPrice: form.minGasPrice,
                                blockBaseFeePerGas: form.blockBaseFeePerGas
                            })
                        )}
                >
                    {loading ? 'Creating...' : 'Create'}
                </vscode-button>
            {:else if $chainNavigator.activeTab === 'connect'}
                <ValidableTextInput
                    label="URI Connection String"
                    validate={validateNonEmptyString}
                    tooltip="The URI connection string is the connection string to the Ethereum node to connect to. This can be an Alchemy, Infura, or any other Ethereum node provider."
                    placeholder="ws://localhost:8545"
                    bind:value={form.uri}
                />

                <!-- svelte-ignore a11y-click-events-have-key-events -->
                <!-- possibly add disabled={!form.uri} -->
                <vscode-button
                    appearance="primary"
                    disabled={loading}
                    on:click={() =>
                        processChainSetup(() =>
                            connectToLocalChain(
                                form.displayName,
                                form.uri ?? '' // @dev silence typing error
                            )
                        )}
                >
                    {loading ? 'Connecting...' : 'Connect'}
                </vscode-button>
            {/if}
        </div>
    </div>
{/if}
