<script lang="ts">
    import {
        provideVSCodeDesignSystem,
        vsCodeButton,
        vsCodeDropdown,
        vsCodeOption,
        vsCodeDivider,
        vsCodeCheckbox,
        vsCodeTextField,
        vsCodePanels,
        vsCodePanelTab,
        vsCodeBadge,
        vsCodePanelView
    } from '@vscode/webview-ui-toolkit';
    import Contract from '../../components/Contract.svelte';
    import Run from '../../pages/run/Run.svelte';
    import CompileDeploy from './CompileDeploy.svelte';
    import Divider from '../../components/Divider.svelte';
    import CallSetup from '../../components/CallSetup.svelte';
    import {
        StateId,
        WebviewMessage,
        type FunctionCallPayload,
        type WakeFunctionCallRequestParams,
        type ContractFunction as ContractFunctionType
    } from '../../../shared/types';
    import { onMount } from 'svelte';
    import { messageHandler } from '@estruyf/vscode/dist/client';
    // import '../../../shared/types'; // Importing types to avoid TS error

    provideVSCodeDesignSystem().register(
        vsCodeButton(),
        vsCodeDropdown(),
        vsCodeOption(),
        vsCodeDivider(),
        vsCodeCheckbox(),
        vsCodeTextField(),
        vsCodePanels(),
        vsCodePanelTab(),
        vsCodeBadge(),
        vsCodePanelView()
    );

    let deployedContracts: Array<any> = [];
    let callSetup: CallSetup;

    onMount(() => {
        messageHandler.send(WebviewMessage.getState, StateId.DeployedContracts);
    });

    window.addEventListener('message', (event) => {
        if (!event.data.command) return;

        const { command, payload, stateId } = event.data;

        switch (command) {
            case WebviewMessage.getState: {
                if (stateId === StateId.DeployedContracts) {
                    deployedContracts = payload;
                }

                break;
            }
        }
    });

    // @todo extract into a helper function
    const call = async function (
        calldata: string,
        contract_address: string,
        func: ContractFunctionType
    ) {
        const _sender: string | undefined = callSetup.getSelectedAccount()?.address;
        if (_sender === undefined) {
            messageHandler.send(WebviewMessage.onError, 'Failed deployment, undefined sender');
            return;
        }

        const _value: number = callSetup.getValue() ?? 0;

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

        await messageHandler.send(WebviewMessage.onContractFunctionCall, payload);
    };
</script>

<main>
    <!-- <CallSetup bind:this={callSetup} />

    <Divider /> -->

    <vscode-panels class="w-full">
        <vscode-panel-tab id="tab-1">Compile & Deploy</vscode-panel-tab>
        <vscode-panel-tab id="tab-2">
            Deployed contracts
            {#if deployedContracts.length > 0}
                <vscode-badge appearance="secondary">{deployedContracts.length}</vscode-badge>
            {/if}
        </vscode-panel-tab>
        <vscode-panel-tab id="tab-3">Mimi</vscode-panel-tab>

        <vscode-panel-view id="view-1">
            <CompileDeploy />
        </vscode-panel-view>
        <vscode-panel-view id="view-2">
            <Run />
        </vscode-panel-view>
        <vscode-panel-view id="view-3">
            <ul>
                {#each { length: 200 } as _, i}
                    <li>{i + 1}</li>
                {/each}
            </ul>
        </vscode-panel-view>
    </vscode-panels>
</main>

<style global>
    @tailwind base;
    @tailwind components;
    @tailwind utilities;

    body {
        padding: 0 10px 10px !important;
    }
</style>
