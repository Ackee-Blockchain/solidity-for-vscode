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
    import CallSetup from '../../components/CallSetup.svelte';
    import {
        type FunctionCallPayload,
        type WakeFunctionCallRequestParams,
        type ContractFunction as ContractFunctionType
    } from '../../../shared/types';
    import { onMount } from 'svelte';
    import Tabs from '../../components/Tabs.svelte';
    import { selectedAccount, selectedValue, setupStores } from '../../helpers/store';
    import { functionCall, showErrorMessage } from '../../helpers/api';
    import Compile from './Compile.svelte';
    import Deploy from './Deploy.svelte';
    import Run from './Run.svelte';
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
    let initLoading = true;

    onMount(async () => {
        await setupStores();
        initLoading = false;
    });

    // @todo extract into a helper function

    enum TabId {
        CompileDeploy = 0,
        DeployedContracts = 1,
        Mimi = 2,
        Mimi2 = 3
    }

    let tabs: { id: any; label: string }[] = [
        {
            id: TabId.CompileDeploy,
            label: 'Compile & Deploy'
        },
        {
            id: TabId.DeployedContracts,
            label: 'Deployed contracts'
        },
        {
            id: TabId.Mimi,
            label: 'Mimi'
        },
        {
            id: TabId.Mimi,
            label: 'Kokoska kokosova'
        }
    ];
</script>

<main class="h-full my-0 overflow-hidden">
    {#if initLoading}
        <span>Connecting with Wake...</span>
    {:else}
        <Tabs {tabs}>
            <svelte:fragment slot="tab-header" let:tabId>
                {#if tabId == TabId.DeployedContracts}
                    <vscode-badge appearance="secondary">{deployedContracts.length}</vscode-badge>
                {/if}
            </svelte:fragment>
            <svelte:fragment slot="content-fixed" let:tabId>
                {#if tabId == TabId.CompileDeploy}
                    <CallSetup />
                    <Compile />
                {:else if tabId == TabId.DeployedContracts}
                    <CallSetup />
                {:else if tabId == TabId.Mimi}
                    <CallSetup />
                {/if}
            </svelte:fragment>
            <svelte:fragment slot="content-scrollable" let:tabId>
                {#if tabId == TabId.CompileDeploy}
                    <Deploy />
                {:else if tabId == TabId.DeployedContracts}
                    <Run />
                {:else if tabId == TabId.Mimi}
                    <ul>
                        {#each { length: 200 } as _, i}
                            <li>{i + 1}</li>
                        {/each}
                    </ul>
                {/if}
            </svelte:fragment>
        </Tabs>
    {/if}
</main>

<style global>
    @tailwind base;
    @tailwind components;
    @tailwind utilities;

    body {
        /* padding: 0 10px 10px !important; */
        padding: 0 !important;
    }
</style>
