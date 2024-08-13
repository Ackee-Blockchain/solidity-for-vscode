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
    import Contract from '../../components/Contract.svelte';
    import Divider from '../../components/Divider.svelte';
    import {
        type CallPayload,
        type WakeCallRequestParams,
        type ContractFunction as ContractFunctionType
    } from '../../../shared/types';
    import { deployedContracts, selectedAccount, selectedValue } from '../../helpers/store';
    import { functionCall, showErrorMessage } from '../../helpers/api';
    import TextContainerDark from '../../components/TextContainerDark.svelte';
    // import '../../../shared/types'; // Importing types to avoid TS error

    provideVSCodeDesignSystem().register(
        vsCodeButton(),
        vsCodeDropdown(),
        vsCodeOption(),
        vsCodeDivider(),
        vsCodeCheckbox(),
        vsCodeTextField()
    );

    // let filterString: string = '';

    // @todo extract into a helper function
    const call = async function (
        calldata: string,
        contractAddress: string,
        func: ContractFunctionType
    ) {
        const _sender: string | undefined = $selectedAccount?.address;
        if (_sender === undefined) {
            showErrorMessage('Failed deployment, undefined sender');
            return;
        }

        const _value: number = $selectedValue ?? 0;

        const requestParams: WakeCallRequestParams = {
            contractAddress: contractAddress,
            sender: _sender,
            calldata: calldata,
            // @dev automatically set value to 0 if function is not payable
            value: func.stateMutability === 'payable' ? _value : 0
        };

        console.log('requestParams');

        const payload: CallPayload = {
            func: func,
            requestParams: requestParams
        };

        functionCall(payload);
    };

    // const handleFilter = function (e: any) {
    //     filterString = e.target?.value;
    //     // console.log("filter string", _filterString);
    // };
</script>

{#if $deployedContracts.length > 0}
    <section class="w-full">
        <!-- <vscode-text-field
            class="w-full mb-2"
            placeholder="Filter compiled contracts"
            disabled={$deployedContracts.length === 0}
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
        </vscode-text-field> -->

        <div class="flex flex-col gap-5">
            {#each $deployedContracts as contract, i}
                <!-- {#if i > 0}
                    <Divider />
                {/if} -->
                <Contract {contract} onFunctionCall={call} />
            {/each}
        </div>
    </section>
{:else}
    <section class="h-full w-full flex flex-col items-center justify-center gap-3">
        <div class="flex flex-col gap-2 items-center">
            <svg
                width="16"
                height="16"
                viewBox="0 0 16 16"
                xmlns="http://www.w3.org/2000/svg"
                fill="currentColor"
                ><path
                    fill-rule="evenodd"
                    clip-rule="evenodd"
                    d="M14.491 1c-3.598.004-6.654 1.983-8.835 4H1.5l-.5.5v3l.147.354.991.991.001.009 4 4 .009.001.999.999L7.5 15h3l.5-.5v-4.154c2.019-2.178 3.996-5.233 3.992-8.846l-.501-.5zM2 6h2.643a23.828 23.828 0 0 0-2.225 2.71L2 8.294V6zm5.7 8l-.42-.423a23.59 23.59 0 0 0 2.715-2.216V14H7.7zm-1.143-1.144L3.136 9.437C4.128 8 8.379 2.355 13.978 2.016c-.326 5.612-5.987 9.853-7.421 10.84zM4 15v-1H2v-2H1v3h3zm6.748-7.667a1.5 1.5 0 1 0-2.496-1.666 1.5 1.5 0 0 0 2.495 1.666z"
                />
            </svg>
            <span class="text-sm my-2 text-center text-secon">No deployed contracts</span>
        </div>
    </section>
    <!-- <p class="text-center">No contracts are compiled</p> -->
{/if}

<style global>
    @tailwind base;
    @tailwind components;
    @tailwind utilities;
</style>
