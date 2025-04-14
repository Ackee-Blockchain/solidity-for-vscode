<script lang="ts">
    import { onMount } from 'svelte';
    import { defaultConfig, connected, signerAddress, chainId, WC } from 'svelte-wagmi';
    import { walletConnect } from 'wagmi/connectors';
    import Sake from './Sake.svelte';

    // Import the child component to wrap with Wagmi functionality
    onMount(async () => {
        // Initialize Wagmi with default configuration
        const wagmiClient = defaultConfig({
            appName: 'Tools-for-Solidity',
            walletConnectProjectId: '2acb5171259f8ee5730817ee8c913587',
            connectors: [
                walletConnect({
                    projectId: '2acb5171259f8ee5730817ee8c913587'
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
</script>

<slot />

<div class="wagmi-wrapper">
    <!-- Wallet connection status bar -->
    <div class="wallet-status-bar">
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
        {:else}
            <div class="connect-button-container">
                <button class="connect-button" on:click={connectWallet}> Connect Wallet </button>
            </div>
        {/if}
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
