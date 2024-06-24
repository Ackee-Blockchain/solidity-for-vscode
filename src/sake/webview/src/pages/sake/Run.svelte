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
    import CallSetup from '../../components/CallSetup.svelte';
    import {
        type FunctionCallPayload,
        type WakeFunctionCallRequestParams,
        type ContractFunction as ContractFunctionType
    } from '../../../shared/types';
    import { selectedAccount, selectedValue } from '../../helpers/store';
    import { functionCall, showErrorMessage } from '../../helpers/api';
    // import '../../../shared/types'; // Importing types to avoid TS error

    provideVSCodeDesignSystem().register(
        vsCodeButton(),
        vsCodeDropdown(),
        vsCodeOption(),
        vsCodeDivider(),
        vsCodeCheckbox(),
        vsCodeTextField()
    );

    let deployedContracts: Array<any> = [];
    let callSetup: CallSetup;

    // @todo extract into a helper function
    const call = async function (
        calldata: string,
        contract_address: string,
        func: ContractFunctionType
    ) {
        const _sender: string | undefined = $selectedAccount?.address;
        if (_sender === undefined) {
            showErrorMessage('Failed deployment, undefined sender');
            return;
        }

        const _value: number = $selectedValue ?? 0;

        const requestParams: WakeFunctionCallRequestParams = {
            contract_address: contract_address,
            sender: _sender,
            calldata: calldata,
            // @dev automatically set value to 0 if function is not payable
            value: func.stateMutability === 'payable' ? _value : 0
        };

        const payload: FunctionCallPayload = {
            func: func,
            requestParams: requestParams
        };

        functionCall(payload);
    };
</script>

<main class="w-full">
    <section>
        <p class="mb-2">Deployed Contracts</p>
        {#each deployedContracts as contract, i}
            {#if i > 0}
                <Divider />
            {/if}
            <Contract {contract} onFunctionCall={call} />
        {/each}
    </section>
</main>

<style global>
    @tailwind base;
    @tailwind components;
    @tailwind utilities;
</style>
