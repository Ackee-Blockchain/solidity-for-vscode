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
    import { onMount } from 'svelte';
    import Tabs from './components/common/Tabs.svelte';
    import { deployedContracts, requestState, wakeState, setupListeners } from './stores/sakeStore';
    import { compilationIssuesVisible, activeTabId, txParametersExpanded } from './stores/appStore';
    import Compile from './views/Compile.svelte';
    import Deploy from './views/Deploy.svelte';
    import Run from './views/Run.svelte';
    import BackIcon from './components/icons/BackIcon.svelte';
    import CompilationIssues from './components/CompilationIssues.svelte';
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

    import { openExternal } from './helpers/api';
    import ChevronRight from './components/icons/ChevronRight.svelte';
    import ChevronDown from './components/icons/ChevronDown.svelte';
    import BlankIcon from './components/icons/BlankIcon.svelte';
    import type { ComponentType, SvelteComponent } from 'svelte';
    import Interaction from './pages/Interaction.svelte';
    import Deployment from './pages/Deployment.svelte';
    import InteractionHeader from './pages/InteractionHeader.svelte';

    let initLoading = true;

    const SERVER_TIMEOUT = 10_000;

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
        startServer();
        setupListeners();
        activeTabId.set(tabs[0].id);
    });

    const startServer = () => {
        initLoading = true;
        const timeout = setTimeout(() => {
            initLoading = false;
            setServerRunning(false);
            console.log('Server not running', $wakeState);
        }, SERVER_TIMEOUT);
        requestState().then(() => {
            clearTimeout(timeout);
            setServerRunning(true);
            initLoading = false;
        });
    };

    const setServerRunning = (isRunning: boolean) => {
        wakeState.set({
            isAnvilInstalled: $wakeState.isAnvilInstalled,
            isServerRunning: isRunning
        });
    };

    const installAnvil = () => {
        openExternal('https://book.getfoundry.sh/getting-started/installation');
    };
</script>

<main class="h-full my-0 overflow-hidden flex flex-col">
    {#if initLoading}
        <div class="flex flex-col items-center justify-center gap-3 h-full w-full">
            <vscode-progress-ring />
            <span>Connecting with Wake...</span>
        </div>
    {:else if $wakeState.isServerRunning === false}
        <div class="flex flex-col gap-4 h-full w-full p-4">
            <h3 class="uppercase font-bold text-base">Wake Server is not running</h3>
            <span
                >The Wake LSP server does not seem to be running. Please make sure that you have a
                workspace with Solidity files open.
            </span>
            <!-- svelte-ignore a11y-click-events-have-key-events -->
            <vscode-button appearance="primary" on:click={startServer}>
                Restart Connection
            </vscode-button>
        </div>
    {:else if !$wakeState.isAnvilInstalled}
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
