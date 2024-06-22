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
    import Spacer from '../../components/Spacer.svelte';
    import Contract from '../../components/Contract.svelte';
    import Divider from '../../components/Divider.svelte';
    import CallSetup from '../../components/CallSetup.svelte';
    import { messageHandler } from '@estruyf/vscode/dist/client';
    import {
        StateId,
        WebviewMessage,
        type CompilationStateData,
        type CompiledContract,
        type WakeDeploymentRequestParams
    } from '../../../shared/types';
    import { onMount } from 'svelte';
    import Constructor from '../../components/Constructor.svelte';

    provideVSCodeDesignSystem().register(
        vsCodeButton(),
        vsCodeDropdown(),
        vsCodeOption(),
        vsCodeDivider(),
        vsCodeCheckbox(),
        vsCodeTextField()
    );

    let compiledContracts: Array<CompiledContract> = [];
    let selectedContract: CompiledContract | undefined = undefined;
    let compiling = false;
    let dirtyCompilation = false;
    let callSetup: CallSetup;
    let filterString: string = '';

    onMount(() => {
        messageHandler.send(WebviewMessage.getState, StateId.CompiledContracts);
    });

    const setCompilationState = (payload: CompilationStateData) => {
        compiledContracts = payload.contracts;
        if (selectedContract === undefined && compiledContracts.length > 0) {
            selectedContract = compiledContracts[0];
        }
        dirtyCompilation = payload.dirty;
    };

    const compile = async () => {
        compiling = true;

        const success = await messageHandler.request<boolean>(WebviewMessage.onCompile);
        if (success) {
            dirtyCompilation = false;
        }

        compiling = false;
    };

    window.addEventListener('message', (event) => {
        if (!event.data.command) return;

        const { command, payload, stateId } = event.data;

        switch (command) {
            case WebviewMessage.getState:
                if (stateId == StateId.CompiledContracts) {
                    if (payload === undefined) {
                        return;
                    }
                    setCompilationState(payload as CompilationStateData);
                    return;
                }

                break;
        }
    });

    const createRandomAddress = function () {
        return '0x' + Math.random().toString(16).slice(2);
    };

    const deploy = async function (contract: CompiledContract, calldata: string) {
        const _sender: string | undefined = callSetup.getSelectedAccount()?.address;
        if (_sender === undefined) {
            messageHandler.send(WebviewMessage.onError, 'Failed deployment, undefined sender');
            return;
        }

        const _value: number | undefined = callSetup.getValue();

        const payload: WakeDeploymentRequestParams = {
            contract_fqn: contract.fqn,
            sender: _sender,
            calldata: calldata,
            value: _value ?? 0
        };

        await messageHandler.send(WebviewMessage.onDeploy, payload);
    };

    const selectContract = function (e: CustomEvent) {
        // console.log("selected contract id", e.detail.value);

        const _selectedContractId = e.detail.value;
        if (_selectedContractId == null || _selectedContractId >= compiledContracts.length) {
            selectedContract = undefined;
        } else {
            selectedContract = compiledContracts[_selectedContractId];
        }

        // console.log("selected contract", selectedContract);
    };

    const handleFilter = function (e: any) {
        filterString = e.target?.value;
        // console.log("filter string", _filterString);
    };
</script>

<main class="w-full">
    <CallSetup bind:this={callSetup} />

    <!-- <p class="ml-1 text-sm">Compiler version</p>
    <vscode-dropdown position="below" class="w-full mb-3">
        <vscode-option>Auto-compile</vscode-option>
    </vscode-dropdown> -->

    <!-- svelte-ignore a11y-click-events-have-key-events -->
    <vscode-button
        class="w-full mt-3"
        on:click={compile}
        appearence={dirtyCompilation ? 'primary' : 'secondary'}
        disabled={compiling}
    >
        {compiling ? 'Compiling...' : 'Compile all'}
    </vscode-button>
    {#if dirtyCompilation}
        <div
            class="text-sm px-2 py-1 bg-gray-800 rounded relative top--2 text-center pt-2 pb-1"
            style="z-index:0;"
        >
            Some files were changed since last compilation
        </div>
    {/if}

    <Divider />

    <vscode-text-field
        class="w-full mb-2"
        placeholder="Filter compiled contracts"
        disabled={compiledContracts.length === 0}
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
            {#each compiledContracts as contract, i}
                {#if contract.fqn.toLowerCase().includes(filterString.toLowerCase())}
                    <Constructor
                        abi={contract.abi}
                        name={contract.name}
                        onDeploy={(calldata) => deploy(contract, calldata)}
                    />
                {/if}
                <!-- <Constructor
                    abi={contract.abi}
                    name={contract.name}
                    onDeploy={(calldata) => deploy(contract, calldata)}
                /> -->
            {/each}
        </div>
        <!-- <p class="ml-1 text-sm">Contract</p>
        <vscode-dropdown position="below" class="w-full" on:change={selectContract}>
        </vscode-dropdown>
        <div class="my-4"></div>

        {#if selectedContract !== undefined}
            <Constructor abi={selectedContract.abi} onDeploy={deploy} />
        {/if} -->

        <!-- svelte-ignore a11y-click-events-have-key-events -->
    </section>
</main>

<style global>
    @tailwind base;
    @tailwind components;
    @tailwind utilities;
</style>
