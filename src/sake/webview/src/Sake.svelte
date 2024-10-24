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
    import { onMount } from 'svelte';
    import Tabs from './components/common/Tabs.svelte';
    import { requestState, setupListeners, appState, chainState } from './stores/sakeStore';
    import { RESTART_WAKE_SERVER_TIMEOUT, RESTART_WAKE_SERVER_TRIES } from './helpers/constants';

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

    import {
        openExternal,
        requestNewProvider,
        restartWakeServer,
        selectChain
    } from './helpers/api';
    import type { ComponentType, SvelteComponent } from 'svelte';
    import Interaction from './pages/Interaction.svelte';
    import Deployment from './pages/Deployment.svelte';
    import InteractionHeader from './pages/InteractionHeader.svelte';

    let showLoading = true;

    enum TabId {
        CompileDeploy = 0,
        DeployedContracts = 1
    }

    let tabs: { id: any; label: string; content: ComponentType; header?: ComponentType }[] = [
        {
            id: TabId.CompileDeploy,
            label: 'Deploy',
            content: Deployment
        },
        {
            id: TabId.DeployedContracts,
            label: 'Interact',
            content: Interaction,
            header: InteractionHeader
        }
    ];

    onMount(async () => {
        setupListeners(); // @dev listeners have to be set up before requesting state
        await requestState();
        showLoading = false;
    });

    const tryWakeServerRestart = (tries: number = 0) => {
        showLoading = true;
        if (tries >= RESTART_WAKE_SERVER_TRIES) {
            showLoading = false;
            return;
        }

        const wakeServerRestartTimeout = setTimeout(() => {
            tryWakeServerRestart(tries + 1);
        }, RESTART_WAKE_SERVER_TIMEOUT);

        restartWakeServer().then((success) => {
            if (success) {
                clearTimeout(wakeServerRestartTimeout);
                showLoading = false;
            }
        });
    };

    const installAnvil = () => {
        openExternal('https://book.getfoundry.sh/getting-started/installation');
    };
</script>

<main class="h-full my-0 overflow-hidden flex flex-col">
    {#if !$appState.isInitialized}
        <div class="flex flex-col items-center justify-center gap-3 h-full w-full">
            <vscode-progress-ring />
            <span>Setting up Deploy and Interact UI...</span>
        </div>
    {:else if showLoading}
        <div class="flex flex-col items-center justify-center gap-3 h-full w-full">
            <vscode-progress-ring />
            <span>Loading...</span>
        </div>
    {:else if $chainState.chains.length === 0}
        <div class="flex flex-col gap-4 h-full w-full p-4">
            <h3 class="uppercase font-bold text-base">No chains found</h3>
            <span>No chains set up. Please set up a chain first. </span>
            <!-- svelte-ignore a11y-click-events-have-key-events -->
            <vscode-button appearance="primary" on:click={requestNewProvider}>
                Setup new chain
            </vscode-button>
        </div>
    {:else if $chainState.currentChainId === undefined}
        <div class="flex flex-col gap-4 h-full w-full p-4">
            <h3 class="uppercase font-bold text-base">No chain selected</h3>
            <span>No chain selected. Please select a chain to get started. </span>
            <!-- svelte-ignore a11y-click-events-have-key-events -->
            <vscode-button appearance="primary" on:click={selectChain}>
                Select chain
            </vscode-button>
        </div>
    {:else if $appState.isOpenWorkspace === 'closed'}
        <div class="flex flex-col gap-4 h-full w-full p-4">
            <h3 class="uppercase font-bold text-base">No workspace opened</h3>
            <span>
                The Deploy and Interact UI requires an open workspace containing Solidity files.
                Please open a project with Solidity contracts to use this feature.
            </span>
        </div>
    {:else if $appState.isOpenWorkspace === 'tooManyWorkspaces'}
        <div class="flex flex-col gap-4 h-full w-full p-4">
            <h3 class="uppercase font-bold text-base">Too many workspaces opened</h3>
            <span>
                The Deploy and Interact UI can only be used with a single workspace opened. Please
                close other workspaces to use this feature.
            </span>
        </div>
    {:else if $appState.isWakeServerRunning === false}
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
    {:else if !$appState.isAnvilInstalled}
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
        <Tabs {tabs}></Tabs>
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
