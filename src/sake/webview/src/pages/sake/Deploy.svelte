<script lang="ts">
    import {
        provideVSCodeDesignSystem,
        vsCodeButton,
        vsCodeDropdown,
        vsCodeOption,
        vsCodeDivider,
        vsCodeCheckbox,
        vsCodeTextField
    } from '@vscode/webview-ui-toolkit';
    import { type CompiledContract } from '../../../shared/types';
    import Constructor from '../../components/Constructor.svelte';
    import { selectedAccount, selectedValue, compiledContracts } from '../../helpers/store';
    import { deployContract, showErrorMessage } from '../../helpers/api';

    provideVSCodeDesignSystem().register(
        vsCodeButton(),
        vsCodeDropdown(),
        vsCodeOption(),
        vsCodeDivider(),
        vsCodeCheckbox(),
        vsCodeTextField()
    );

    let filterString: string = '';

    const deploy = async function (contract: CompiledContract, calldata: string) {
        const _sender: string | undefined = $selectedAccount?.address;
        if (_sender === undefined) {
            showErrorMessage('Failed deployment, undefined sender');
            return;
        }

        deployContract(contract.fqn, _sender, calldata, $selectedValue);
    };

    const handleFilter = function (e: any) {
        filterString = e.target?.value;
        // console.log("filter string", _filterString);
    };
</script>

<main class="w-full">
    {#if $compiledContracts !== undefined}
        <vscode-text-field
            class="w-full mb-2"
            placeholder="Filter compiled contracts"
            disabled={$compiledContracts.contracts.length === 0}
            value={filterString}
            on:input={handleFilter}
        >
            <span slot="start">
                <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="currentColor"
                    ><path
                        d="M15.25 0a8.25 8.25 0 0 0-6.18 13.72L1 22.88l1.12 1 8.05-9.12A8.251 8.251 0 1 0 15.25.01V0zm0 15a6.75 6.75 0 1 1 0-13.5 6.75 6.75 0 0 1 0 13.5z"
                    /></svg
                >
            </span>
        </vscode-text-field>

        <section>
            <div class="flex flex-col gap-1">
                {#each $compiledContracts?.contracts as contract, i}
                    {#if contract.fqn.toLowerCase().includes(filterString.toLowerCase())}
                        <Constructor
                            abi={contract.abi}
                            name={contract.name}
                            onDeploy={(calldata) => deploy(contract, calldata)}
                        />
                    {/if}
                {/each}
            </div>
        </section>
    {:else}
        <p class="text-center">No contracts are compiled</p>
    {/if}
</main>

<style global>
    @tailwind base;
    @tailwind components;
    @tailwind utilities;
</style>
