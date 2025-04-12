<script lang="ts">
    import { chainNavigator } from '../helpers/stores';
    import ValidableTextInput from './common/ValidableTextInput.svelte';
    import { validateNonEmptyString, validateNumber } from '../helpers/validation';
    import DefaultButton from './icons/DefaultButton.svelte';
    import { connectToLocalChain, createNewLocalChain } from '../helpers/api';
    import { chainState } from '../helpers/stores';
    import BigButton from './common/BigButton.svelte';
    import Divider from './Divider.svelte';

    // export let form:
    //     | (NetworkCreationConfiguration & { displayName?: string })
    //     | NetworkConnectionConfiguration = {
    //     displayName: 'Local Chain'
    // };

    export let form: {
        displayName: string;
        accounts?: string;
        chainId?: string;
        fork?: string;
        hardfork?: string;
        minGasPrice?: string;
        blockBaseFeePerGas?: string;
        uri?: string;
    } = {
        displayName: 'Local Chain'
    };

    // Define a type for the selected chain
    interface ChainConfig {
        name: string;
        chainId?: number;
        rpcUrl?: string;
        iconUri?: string;
        isBlank?: boolean;
        isConnection?: boolean;
    }

    let loading = false;
    let selectedChain: ChainConfig | null = null;
    let showAdvanced = false;

    const processChainSetup = async (chainSetup: () => Promise<{ success: boolean }>) => {
        loading = true;
        await chainSetup().then(({ success }) => {
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
    <div class="">
        <!-- TODO: remove hardcoded background color -->
        <div class="flex flex-col">
            <!-- Chain Templates Section -->
            <Divider className="my-0" />
            <div class="text-sm opacity-75 text-center mt-1">1. Choose Chain Name</div>

            <div class="flex flex-col gap-3 p-2 font-sm">
                <div class="flex flex-col gap-1">
                    <ValidableTextInput
                        label="Display Name"
                        validate={validateNonEmptyString}
                        autofocus={true}
                        bind:value={form.displayName}
                    />
                </div>
            </div>

            <!-- Chain Templates Section -->
            <Divider className="my-0" />
            <div class="text-sm opacity-75 text-center mt-1">2. Select Chain Type</div>
            <div class="flex flex-col gap-3 px-2 py-3 font-sm">
                <div class="grid gap-2 w-full preconfig-grid-2">
                    <!-- Blank Chain Option - Full Width -->
                    <BigButton
                        label="Blank Chain"
                        description="Start with a new empty chain (with your custom settings)"
                        className="w-full"
                        active={selectedChain?.isBlank === true}
                        on:click={() => {
                            // Reset all form values to defaults
                            form = {
                                ...form,
                                chainId: undefined,
                                accounts: '10',
                                fork: undefined,
                                hardfork: 'latest',
                                minGasPrice: '0',
                                blockBaseFeePerGas: '0'
                            };
                            selectedChain = { isBlank: true, name: 'Blank Chain' };
                        }}
                    />

                    <!-- Connect to Existing Chain - Full Width -->
                    <BigButton
                        label="Connect to Existing Chain"
                        description="Connect to a running Ethereum node (like Anvil)"
                        className="w-full"
                        active={selectedChain?.isConnection === true}
                        on:click={() => {
                            // Reset connection form
                            form = {
                                ...form,
                                uri: undefined
                            };
                            selectedChain = { isConnection: true, name: 'External Connection' };
                        }}
                    />
                </div>

                <!-- Preconfigured Networks Section -->

                <div class="text-sm opacity-75 text-center mt-1">or fork from</div>

                <div class="grid gap-2 w-full preconfig-grid">
                    {#each $chainState.defaultPreconfigs as preconfig}
                        <BigButton
                            label={preconfig.name}
                            iconUrl={preconfig.iconUri}
                            active={selectedChain?.name === preconfig.name}
                            className="w-full"
                            on:click={() => {
                                // Clear previous values first
                                form = {
                                    ...form,
                                    chainId: undefined,
                                    accounts: '10',
                                    fork: undefined,
                                    hardfork: 'latest',
                                    minGasPrice: '0',
                                    blockBaseFeePerGas: '0'
                                };

                                // Then set chain-specific values
                                selectedChain = preconfig;

                                if (preconfig.chainId) {
                                    form.chainId = preconfig.chainId.toString();
                                }

                                if (preconfig.rpc && preconfig.rpc.length > 0) {
                                    form.fork = preconfig.rpc[0];
                                }
                            }}
                        />
                    {/each}
                </div>
            </div>

            {#if selectedChain}
                <!-- Connection form -->
                {#if selectedChain.isConnection}
                    <Divider className="my-0" />

                    <div class="text-sm opacity-75 text-center mt-1">3. Connection Settings</div>
                    <div class="flex flex-col gap-2 p-2 font-sm">
                        <div class="flex flex-col gap-1">
                            <ValidableTextInput
                                label="URI Connection String"
                                validate={validateNonEmptyString}
                                tooltip="The URI connection string to the Ethereum node to connect to."
                                placeholder="ws://localhost:8545"
                                bind:value={form.uri}
                            />
                        </div>
                    </div>
                    <Divider className="my-0 mb-1" />
                    <div class="flex flex-col gap-2 p-2 font-sm">
                        <!-- Connect button -->
                        <!-- svelte-ignore a11y-click-events-have-key-events -->

                        <vscode-button
                            appearance="primary"
                            disabled={loading || !form.uri}
                            on:click={() =>
                                processChainSetup(() =>
                                    connectToLocalChain(form.displayName, form.uri ?? '', true)
                                )}
                        >
                            {loading ? 'Connecting...' : 'Connect'}
                        </vscode-button>
                    </div>
                    <!-- Chain creation form -->
                {:else}
                    <Divider className="my-0" />

                    <div class="text-sm opacity-75 text-center mt-1">
                        3. Advanced Chain Configuration
                    </div>
                    <div class="flex flex-col gap-2 p-2 font-sm">
                        <div class="flex flex-col gap-1">
                            <!-- Basic configuration fields -->
                            <ValidableTextInput
                                label="Chain ID"
                                validate={validateNumber}
                                tooltip="Chain ID is the identifier of the chain. Ethereum Mainnet has a chain ID of 1."
                                placeholder="1"
                                bind:value={form.chainId}
                                disabled={!selectedChain.isBlank &&
                                    selectedChain.chainId !== undefined}
                            />

                            <ValidableTextInput
                                label="Fork URL"
                                validate={validateNonEmptyString}
                                tooltip="The fork URL is the URL of the Ethereum node to fork from."
                                placeholder="https://eth-mainnet.g.alchemy.com/v2/<api-key>"
                                bind:value={form.fork}
                                disabled={!selectedChain.isBlank &&
                                    selectedChain.rpcUrl !== undefined}
                            />

                            <ValidableTextInput
                                label="Number of accounts"
                                validate={validateNumber}
                                tooltip="The number of accounts to be created on the chain. The default is 10."
                                placeholder="10"
                                bind:value={form.accounts}
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
                    </div>
                    <Divider className="my-0 mb-1" />
                    <div class="flex flex-col gap-3 p-2">
                        <!-- Create button -->
                        <!-- svelte-ignore a11y-click-events-have-key-events -->
                        <vscode-button
                            appearance="primary"
                            disabled={loading}
                            on:click={() =>
                                processChainSetup(() =>
                                    createNewLocalChain(
                                        form.displayName,
                                        {
                                            accounts: form.accounts
                                                ? parseInt(form.accounts)
                                                : undefined,
                                            chainId: form.chainId
                                                ? parseInt(form.chainId)
                                                : undefined,
                                            fork: form.fork,
                                            hardfork: form.hardfork,
                                            minGasPrice: form.minGasPrice
                                                ? parseInt(form.minGasPrice)
                                                : undefined,
                                            blockBaseFeePerGas: form.blockBaseFeePerGas
                                                ? parseInt(form.blockBaseFeePerGas)
                                                : undefined
                                        },
                                        true
                                    )
                                )}
                        >
                            {loading ? 'Creating...' : 'Create'}
                        </vscode-button>
                    </div>
                {/if}
            {/if}
        </div>
    </div>
{/if}

<style>
    /* Preconfig grid 1 */
    .preconfig-grid {
        grid-template-columns: repeat(1, 1fr);
    }

    @media (min-width: 360px) {
        .preconfig-grid {
            grid-template-columns: repeat(2, 1fr);
        }
    }

    @media (min-width: 540px) {
        .preconfig-grid {
            grid-template-columns: repeat(3, 1fr);
        }
    }

    @media (min-width: 720px) {
        .preconfig-grid {
            grid-template-columns: repeat(4, 1fr);
        }
    }

    /* Preconfig grid 2 */
    .preconfig-grid-2 {
        grid-template-columns: repeat(1, 1fr);
    }

    @media (min-width: 360px) {
        .preconfig-grid-2 {
            grid-template-columns: repeat(2, 1fr);
        }
    }
</style>
