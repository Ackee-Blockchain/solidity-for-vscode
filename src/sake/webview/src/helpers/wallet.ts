/**
 * Wallet connection utilities for Svelte applications
 *
 * This module provides a simplified interface for connecting to Ethereum wallets
 * using wagmi and AppKit. It manages wallet connection state through Svelte stores
 * and provides helper functions for wallet interactions.
 *
 * Inspired by: https://github.com/softwarecurator/svelte-wagmi
 */

import { createAppKit, type AppKit } from '@reown/appkit';
import { WagmiAdapter } from '@reown/appkit-adapter-wagmi';
import {
    arbitrum,
    avalanche,
    base,
    celo,
    fantom,
    gnosis,
    mainnet,
    mantle,
    optimism,
    polygon,
    scroll
} from '@reown/appkit/networks';
import {
    disconnect,
    getAccount,
    watchAccount,
    type Config,
    type GetAccountReturnType
} from '@wagmi/core';
import { get, writable } from 'svelte/store';

/**
 * Svelte stores for managing wallet connection state
 */
export const walletModal = writable<AppKit>();
export const isWagmiReady = writable<boolean>(false);
export const isWalletConnected = writable<boolean>(false);
export const userAddress = writable<string | null>(null);
export const currentChainId = writable<number | null>(null);
export const isLoading = writable<boolean>(false);
export const wagmiConfigStore = writable<Config>();

/**
 * Configuration
 */

// WalletConnect project ID - required for WalletConnect v2
const walletConnectProjectId = '2acb5171259f8ee5730817ee8c913587';

// Supported blockchain networks
const supportedNetworks = [
    mainnet,
    optimism,
    arbitrum,
    base,
    polygon,
    gnosis,
    mantle,
    scroll,
    avalanche,
    celo,
    fantom
];

// Analytics metadata for future use
// const metadata: Metadata = {
//     // @todo
// };

// Initialize WagmiAdapter for connecting AppKit with wagmi
const wagmiAdapter = new WagmiAdapter({
    networks: supportedNetworks,
    projectId: walletConnectProjectId
});

// Store wagmi configuration for use throughout the app
wagmiConfigStore.set(wagmiAdapter.wagmiConfig);

// Initialize AppKit modal for wallet connections
// Note: networks must be provided as direct array instead of referencing the variable
const walletConnectModal = createAppKit({
    adapters: [wagmiAdapter],
    networks: [
        mainnet,
        optimism,
        arbitrum,
        base,
        polygon,
        gnosis,
        mantle,
        scroll,
        avalanche,
        celo,
        fantom
    ],
    projectId: walletConnectProjectId
});

// Store modal instance and mark wagmi as loaded
walletModal.set(walletConnectModal);
isWagmiReady.set(true);

/**
 * Helper Functions
 */

/**
 * Wait for user to connect account through modal
 * Returns a promise that resolves when connection is successful
 * or rejects if modal is closed without connecting
 */
function waitForAccountConnection() {
    return new Promise((resolve, reject) => {
        // Subscribe to modal events
        const unsubscribeModal = get(walletModal).subscribeEvents((newState) => {
            if (newState.data.event === 'MODAL_CLOSE') {
                reject('modal closed');
                unsubscribeModal();
            }
        });

        // Watch for account connection
        const unsubscribeAccount = watchAccount(get(wagmiConfigStore), {
            onChange(data) {
                if (data?.isConnected) {
                    // User has connected - resolve promise
                    resolve(data);
                    unsubscribeAccount();
                } else {
                    console.log('Waiting for account connection...');
                }
            }
        });
    });
}

/**
 * Check if user is already connected
 * Polls account status until connection is confirmed or rejected
 * @returns Promise resolving to account data
 */
function checkExistingConnection(): Promise<GetAccountReturnType> {
    return new Promise((resolve, reject) => {
        const checkAccountStatus = () => {
            const account = getAccount(get(wagmiConfigStore));

            if (account.isDisconnected) {
                reject('account is disconnected');
            }

            if (account.isConnecting) {
                // Still connecting, check again after delay
                setTimeout(checkAccountStatus, 250);
            } else {
                // Connection status is determined
                resolve(account);
            }
        };

        checkAccountStatus();
    });
}

/**
 * Set up listeners for account changes
 */
function setupAccountListeners() {
    watchAccount(get(wagmiConfigStore), {
        onChange(data) {
            handleAccountChange(data);
        }
    });
}

/**
 * Handle changes to the connected account
 * Updates stores when user connects, disconnects, or switches accounts/chains
 */
function handleAccountChange(data: GetAccountReturnType) {
    // Wrap async logic in IIFE
    return (async () => {
        if (get(isWagmiReady) && data.address) {
            // User is connected
            const chain = get(wagmiConfigStore).chains.find((chain) => chain.id === data.chainId);

            if (chain) {
                currentChainId.set(chain.id);
            }

            isWalletConnected.set(true);
            isLoading.set(false);
            userAddress.set(data.address);
        } else if (data.isDisconnected && get(isWalletConnected)) {
            // User has disconnected
            isLoading.set(false);
            await disconnectWallet();
        }
    })();
}

/**
 * Public Functions
 */

/**
 * Initialize wallet connection and set up event listeners
 * Checks for existing connections and updates stores accordingly
 */
export async function initializeWalletConnection() {
    try {
        // Set up listeners for account changes
        setupAccountListeners();

        // Check if user is already connected
        const account = await checkExistingConnection();

        if (account.address) {
            // Get the current chain from the connected account
            const chain = get(wagmiConfigStore)?.chains.find(
                (chain) => chain.id === account.chainId
            );

            if (chain) {
                currentChainId.set(chain.id);
            }

            isWalletConnected.set(true);
            userAddress.set(account.address);
        }

        isLoading.set(false);
    } catch (err) {
        isLoading.set(false);
    }
}

/**
 * Open wallet connection modal and wait for user to connect
 * @returns Object indicating success or failure of connection attempt
 */
export async function connectWallet() {
    console.log('connectWallet');
    try {
        get(walletModal).open();
        await waitForAccountConnection();

        return { success: true };
    } catch (err) {
        return { success: false };
    }
}

/**
 * Disconnect wallet and reset state
 */
export async function disconnectWallet() {
    await disconnect(get(wagmiConfigStore));
    isWalletConnected.set(false);
    currentChainId.set(null);
    userAddress.set(null);
    isLoading.set(false);
}
