<script lang="ts">
    import { onMount } from 'svelte';
    import {
        defaultConfig,
        connected,
        signerAddress,
        chainId,
        WC,
        configuredConnectors,
        disconnectWagmi
    } from 'svelte-wagmi';
    import { coinbaseWallet, metaMask, safe, walletConnect } from 'wagmi/connectors';
    import {} from '@wagmi/core';
    import Sake from './Sake.svelte';

    // Import the child component to wrap with Wagmi functionality
    onMount(async () => {
        // Initialize Wagmi with default configuration
        const wagmiClient = defaultConfig({
            appName: 'Solidity (Wake)',
            walletConnectProjectId: '2acb5171259f8ee5730817ee8c913587',
            connectors: [
                walletConnect({
                    projectId: '2acb5171259f8ee5730817ee8c913587'
                }),
                safe({}),
                metaMask({}),
                coinbaseWallet({
                    appName: 'Solidity (Wake)'
                })
            ]
        });

        await wagmiClient.init();
    });

    // Function to connect wallet using WalletConnect
    async function connectWallet() {
        await WC();
    }

    console.log('starting wagmi');

    $: console.log('configuredConnectors', $configuredConnectors);
</script>

<div class="flex flex-col h-full overflow-hidden">
    <div class="flex-grow overflow-auto min-h-0">
        <slot />
    </div>

    <div class="flex-shrink-0">
        <!-- Wallet connection status bar -->
        <div class="wallet-status-bar">
            <div class="flex flex-row gap-2">
                <span>Connectors</span>

                <!-- {#each $configuredConnectors as connector}
                    <span>{connector.name}</span>
                {/each} -->
            </div>
            {#if $connected}
                <div class="wallet-info">
                    <span class="connection-status connected">Connected</span>
                    <span class="chain-id">Chain: {$chainId || 'Unknown'}</span>
                    <span class="wallet-address"
                        >{$signerAddress
                            ? `${$signerAddress.substring(0, 6)}...${$signerAddress.substring($signerAddress.length - 4)}`
                            : ''}</span
                    >
                </div>
                <div class="connect-button-container">
                    <button class="connect-button" on:click={disconnectWagmi}> Disconnect </button>
                </div>
            {:else}
                <div class="connect-button-container">
                    <button class="connect-button" on:click={connectWallet}>
                        Connect Wallet
                    </button>
                </div>
            {/if}
        </div>
    </div>
</div>

<style>
    .wagmi-wrapper {
        display: flex;
        flex-direction: column;
        height: 100%;
    }

    .wallet-status-bar {
        padding: 8px 16px;
        background: var(--vscode-editor-background);
        border-bottom: 1px solid var(--vscode-panel-border);
        display: flex;
        justify-content: flex-end;
        align-items: center;
    }

    .wallet-info {
        display: flex;
        align-items: center;
        gap: 12px;
        font-size: 12px;
    }

    .connection-status {
        padding: 2px 6px;
        border-radius: 4px;
    }

    .connection-status.connected {
        background: var(--vscode-terminal-ansiGreen);
        color: var(--vscode-editor-background);
    }

    .wallet-address {
        font-family: monospace;
        padding: 2px 6px;
        background: var(--vscode-input-background);
        border-radius: 4px;
    }

    .connect-button {
        background: var(--vscode-button-background);
        color: var(--vscode-button-foreground);
        border: none;
        padding: 4px 12px;
        border-radius: 2px;
        cursor: pointer;
        font-size: 12px;
    }

    .connect-button:hover {
        background: var(--vscode-button-hoverBackground);
    }
</style>
