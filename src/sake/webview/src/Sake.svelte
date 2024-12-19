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
    import { appState, chainState, currentChain } from './helpers/stores';

    provideVSCodeDesignSystem().register(
        vsCodeButton(),
        vsCodeOption(),
        vsCodeDivider(),
        vsCodeDropdown(),
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
        openChainsQuickPick,
        openExternal,
        openSettings,
        ping,
        reconnectChain,
        restartWakeServer,
        showErrorMessage
    } from './helpers/api';
    import type { ComponentType } from 'svelte';
    import Interaction from './pages/Interaction.svelte';
    import Deployment from './pages/Deployment.svelte';
    import InteractionHeader from './pages/InteractionHeader.svelte';
    import ChainNavigator from './components/ChainNavigator.svelte';
    import {
        extensionConnectionState,
        loadingMessage,
        loadingShown,
        stateLoadState
    } from './helpers/stores';
    import { loadWithTimeout, withTimeout } from './helpers/helpers';
    import {
        requestAppState,
        requestLocalState,
        requestSharedState,
        setupListeners
    } from './helpers/events';

    setupListeners();

    enum TabId {
        CompileDeploy = 0,
        DeployedContracts = 1
    }

    let tabs: { id: TabId; label: string; content: ComponentType; header?: ComponentType }[] = [
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

    const loadState: () => Promise<boolean> = async () => {
        const sharedStateSuccess = await requestSharedState();
        const localStateSuccess = await requestLocalState();
        return sharedStateSuccess && localStateSuccess;
    };

    const retryPing = async () => {
        await loadWithTimeout(ping(), 5).then((result: boolean) => {
            if (result) {
                extensionConnectionState.set('connected');
                requestAppState();
            }
        });
    };

    onMount(async () => {
        await withTimeout(ping(), 5)
            .then((success: boolean) => {
                if (success) {
                    extensionConnectionState.set('connected');
                    requestAppState().then((success: boolean) => {
                        stateLoadState.set(success ? 'loaded' : 'failed');
                    });
                } else {
                    throw new Error('Pinging extension failed');
                }
            })
            .catch(() => {
                extensionConnectionState.set('failed');
            });
    });

    // Load state when appState is ready
    $: extensionInitializationState = $appState.initializationState;
    $: extensionInitializationState === 'ready' && loadState();

    const tryWakeServerRestart = () => {
        loadWithTimeout(restartWakeServer(), 15, 'Restarting Wake server...')
            .then(async () => {
                const result = await loadWithTimeout(
                    reconnectChain(),
                    15,
                    'Reconnecting to chain...'
                );
                if (!result) {
                    throw new Error('Reconnecting to chain failed');
                }
            })
            .then(async () => {
                const result = await loadWithTimeout(loadState(), 15, 'Loading state...');
                if (!result) {
                    throw new Error('Loading state failed');
                }
            })
            .catch((e) => {
                showErrorMessage(typeof e === 'string' ? e : (e as Error).message);
            });
    };

    const installAnvil = () => {
        openExternal('https://book.getfoundry.sh/getting-started/installation');
    };
</script>

<main class="h-full my-0 overflow-hidden flex flex-col">
    <ChainNavigator />
    <div class="flex-grow overflow-hidden">
        {#if $loadingShown}
            <div class="flex flex-col items-center justify-center gap-3 h-full w-full">
                <vscode-progress-ring />
                <span>{$loadingMessage ?? 'Loading...'}</span>
            </div>
        {:else if $stateLoadState === 'loading' || $extensionConnectionState === 'connecting'}
            <div class="flex flex-col items-center justify-center gap-3 h-full w-full">
                <span>Initializing extension...</span>
            </div>
        {:else if $stateLoadState === 'failed' || $extensionConnectionState === 'failed'}
            <div class="flex flex-col items-center justify-center gap-3 h-full w-full">
                <span>
                    Unexpected error loading state from the extension. Please try restarting VS
                    Code.
                </span>
            </div>
            <!-- {:else if !$appState.isInitialized} -->
            <!-- <div class="flex flex-col items-center justify-center gap-3 h-full w-full">
            <vscode-progress-ring />
            <span>Setting up Deploy and Interact UI...</span>
        </div> -->
        {:else if $appState.initializationState === 'loadingChains'}
            <div class="flex flex-col items-center justify-center gap-3 h-full w-full">
                <span>Loading chains...</span>
            </div>
        {:else if $chainState.chains.length === 0}
            <div class="flex flex-col gap-4 h-full w-full p-4">
                <h3 class="uppercase font-bold text-base">No chains set up</h3>
                <span>Please set up a chain first. </span>
                <!-- svelte-ignore a11y-click-events-have-key-events -->
                <vscode-button appearance="primary" on:click={openChainsQuickPick}>
                    Setup new chain
                </vscode-button>
            </div>
        {:else if $chainState.currentChainId === undefined}
            <div class="flex flex-col gap-4 h-full w-full p-4">
                <h3 class="uppercase font-bold text-base">No chain selected</h3>
                <span>Please select a chain to get started. </span>
                <!-- svelte-ignore a11y-click-events-have-key-events -->
                <vscode-button appearance="primary" on:click={openChainsQuickPick}>
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
                    The Deploy and Interact UI can only be used with a single workspace opened.
                    Please close other workspaces to use this feature.
                </span>
            </div>
        {:else if $appState.isWakeServerRunning === false}
            <div class="flex flex-col gap-4 h-full w-full p-4">
                <h3 class="uppercase font-bold text-base">Wake Server is not running</h3>
                <!-- svelte-ignore a11y-click-events-have-key-events -->
                <!-- svelte-ignore a11y-missing-attribute -->
                <span>
                    The Wake LSP server is not responding. Please ensure Wake is properly installed
                    and running. If issues persist,
                    <span
                        class="cursor-pointer underline"
                        on:click={() => openSettings('Tools-for-Solidity.Wake.installationMethod')}
                    >
                        try changing its installation method</span
                    >.
                </span>
                <!-- svelte-ignore a11y-click-events-have-key-events -->
                <vscode-button appearance="primary" on:click={tryWakeServerRestart}>
                    Restart Connection
                </vscode-button>
            </div>
        {:else if $appState.isAnvilInstalled === false}
            <div class="flex flex-col gap-4 h-full w-full p-4">
                <h3 class="uppercase font-bold text-base">Anvil is not installed</h3>
                <span
                    >To use the <span class="italic">Deploy and Interact UI</span>, Froundry's Anvil
                    is required to be installed on your device in order to start a local chain.
                    Please install Anvil and restart VS Code.
                </span>
                <!-- svelte-ignore a11y-click-events-have-key-events -->
                <vscode-button appearance="primary" on:click={installAnvil}>
                    Visit Anvil Installation Page
                </vscode-button>
            </div>
        {:else if $currentChain?.connected}
            <Tabs {tabs}></Tabs>
        {:else}
            <div class="flex flex-col gap-4 h-full w-full p-4">
                <h3 class="uppercase font-bold text-base">Chain is not connected to network</h3>
                <span
                    >The selected chain is not connected. Please try reconnecting to continue.</span
                >
                <!-- svelte-ignore a11y-click-events-have-key-events -->
                <vscode-button appearance="primary" on:click={reconnectChain}>
                    Try to reconnect
                </vscode-button>
            </div>
        {/if}
    </div>
</main>

<style global>
    @tailwind base;
    @tailwind components;
    @tailwind utilities;

    body {
        /* padding: 0 10px 10px !important; */
        padding: 0 !important;
    }

    /* global styles copying vscode styles */
    :global(.vscode-button-border) {
        border: calc(var(--border-width) * 1px) solid var(--button-border);
    }
    :global(.vscode-bg-input) {
        background: var(--input-background);
    }
    :global(.vscode-box-shadow) {
        box-shadow: rgba(0, 0, 0, 0.36) 0px 0px 8px 2px;
    }
</style>
