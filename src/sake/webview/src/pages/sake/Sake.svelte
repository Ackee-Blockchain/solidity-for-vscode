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
    import {
        deployedContracts,
        setupStores,
        compilationIssuesVisible,
        activeTab
    } from '../../helpers/store';
    import Compile from './Compile.svelte';
    import Deploy from './Deploy.svelte';
    import Run from './Run.svelte';
    import BlankIcon from '../../components/icons/BlankIcon.svelte';
    import BackIcon from '../../components/icons/BackIcon.svelte';
    import CompilationIssues from './CompilationIssues.svelte';
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

    enum TabId {
        CompileDeploy = 0,
        DeployedContracts = 1
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

    onMount(async () => {
        await setupStores();
        initLoading = false;
        activeTab.set(tabs[0].id);
    });
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
            <svelte:fragment slot="content-fixed">
                {#if $activeTab == TabId.CompileDeploy}
                    <CallSetup />
                    <Compile />
                {:else if $activeTab == TabId.DeployedContracts}
                    <CallSetup />
                {/if}
            </svelte:fragment>
            <svelte:fragment slot="content-scrollable">
                {#if $activeTab == TabId.CompileDeploy}
                    {#if $compilationIssuesVisible}
                        <CompilationIssues />
                    {:else}
                        <Deploy />
                    {/if}
                {:else if $activeTab == TabId.DeployedContracts}
                    <Run />
                {/if}
            </svelte:fragment>
            <svelte:fragment slot="content-header">
                {#if $compilationIssuesVisible && $activeTab === TabId.CompileDeploy}
                    <!-- svelte-ignore a11y-click-events-have-key-events -->
                    <!-- svelte-ignore a11y-missing-attribute -->
                    <a
                        on:click={() => compilationIssuesVisible.set(false)}
                        class="flex gap-1 cursor-pointer items-center"
                    >
                        <BackIcon />
                        <span>Compilation issues</span>
                    </a>
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
