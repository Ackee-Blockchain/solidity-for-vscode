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
        vsCodePanelView,
        vsCodeProgressRing
    } from '@vscode/webview-ui-toolkit';
    import CallSetup from '../../components/CallSetup.svelte';
    import { onMount } from 'svelte';
    import Tabs from '../../components/Tabs.svelte';
    import { deployedContracts, setupStores } from '../../helpers/store';
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
        vsCodePanelView(),
        vsCodeProgressRing()
    );

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
        }
    ];
</script>

<main class="h-full my-0 overflow-hidden">
    {#if initLoading}
        <div class="flex flex-col items-center justify-center gap-3 h-full w-full">
            <vscode-progress-ring />
            <span>Connecting with Wake...</span>
        </div>
    {:else}
        <Tabs {tabs}>
            <svelte:fragment slot="tab-header" let:tabId>
                {#if tabId == TabId.DeployedContracts}
                    <vscode-badge appearance="secondary">
                        <!-- style="padding:5px 3px;" -->
                        {$deployedContracts.length}
                    </vscode-badge>
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
