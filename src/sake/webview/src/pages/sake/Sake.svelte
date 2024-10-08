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
        vsCodeProgressRing,
        vsCodeTag
    } from '@vscode/webview-ui-toolkit';
    import CallSetup from '../../components/CallSetup.svelte';
    import { onMount } from 'svelte';
    import Tabs from '../../components/Tabs.svelte';
    import {
        deployedContracts,
        compilationIssuesVisible,
        activeTab,
        sharedChainState,
        setupListeners,
        requestState
    } from '../../helpers/store';
    import Compile from './Compile.svelte';
    import Deploy from './Deploy.svelte';
    import Run from './Run.svelte';
    import BackIcon from '../../components/icons/BackIcon.svelte';
    import CompilationIssues from '../../components/CompilationIssues.svelte';
    import {
        RESTART_WAKE_SERVER_TIMEOUT,
        RESTART_WAKE_SERVER_TRIES
    } from '../../helpers/constants';
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
        vsCodeProgressRing(),
        vsCodeTag()
    );

    import { openExternal, requestNewProvider, restartWakeServer } from '../../helpers/api';

    let showLoading = true;

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
        setupListeners(); // @dev listeners have to be set up before requesting state
        await requestState();
        activeTab.set(tabs[0].id);
        showLoading = false;
    });

    // const startServer = () => {
    //     showLoading = true;
    //     const timeout = setTimeout(() => {
    //         showLoading = false;
    //         setServerRunning(false);
    //         console.log('Server not running', $sharedChainState);
    //     }, SERVER_TIMEOUT);
    //     requestState().then(() => {
    //         clearTimeout(timeout);
    //         setServerRunning(true);
    //         showLoading = false;
    //     });
    // };

    const tryWakeServerRestart = (tries: number = 0) => {
        showLoading = true;
        console.log('tryWakeServerRestart', tries);
        if (tries >= RESTART_WAKE_SERVER_TRIES) {
            showLoading = false;
            return;
        }

        const wakeServerRestartTimeout = setTimeout(() => {
            tryWakeServerRestart(tries + 1);
        }, RESTART_WAKE_SERVER_TIMEOUT);

        restartWakeServer().then((success) => {
            if (success) {
                console.log('Wake server restarted');
                clearTimeout(wakeServerRestartTimeout);
                showLoading = false;
            }
        });
    };

    const installAnvil = () => {
        openExternal('https://book.getfoundry.sh/getting-started/installation');
    };
</script>

<main class="h-full my-0 overflow-hidden">
    {#if $sharedChainState.chains.length === 0}
        <div class="flex flex-col gap-4 h-full w-full p-4">
            <h3 class="uppercase font-bold text-base">No chains found</h3>
            <span>No chains set up. Please set up a chain first. </span>
            <!-- svelte-ignore a11y-click-events-have-key-events -->
            <vscode-button appearance="primary" on:click={requestNewProvider}>
                Setup new chain
            </vscode-button>
        </div>
    {:else if showLoading}
        <div class="flex flex-col items-center justify-center gap-3 h-full w-full">
            <vscode-progress-ring />
            <span>Connecting with Wake...</span>
        </div>
    {:else if $sharedChainState.isWakeServerRunning === false}
        <div class="flex flex-col gap-4 h-full w-full p-4">
            <h3 class="uppercase font-bold text-base">Wake Server is not running</h3>
            <span
                >The Wake LSP server does not seem to be running. Please make sure that you have a
                workspace with Solidity files open.
            </span>
            <!-- svelte-ignore a11y-click-events-have-key-events -->
            <vscode-button appearance="primary" on:click={tryWakeServerRestart}>
                Restart Connection
            </vscode-button>
        </div>
    {:else if !$sharedChainState.isAnvilInstalled}
        <div class="flex flex-col gap-4 h-full w-full p-4">
            <h3 class="uppercase font-bold text-base">Anvil is not installed</h3>
            <span
                >To use the <span class="italic">Deploy and Interact UI</span>, Froundry's Anvil is
                required to be installed on your device in order to start a local chain. Please
                install Anvil and restart VS Code.
            </span>
            <!-- svelte-ignore a11y-click-events-have-key-events -->
            <vscode-button appearance="primary" on:click={installAnvil}>
                Visit Anvil Installation Page
            </vscode-button>
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
