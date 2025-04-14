import { Uri } from 'vscode';
import { SakeContext } from '../context';
import * as fs from 'fs';
import { ChainPreconfig } from '../webview/shared/network_types';

/**
 * The list of default chains
 * pruned https://github.com/ethereum-lists/chains
 */

export const defaultChainList = [
    {
        name: 'Ethereum',
        chain: 'ETH',
        rpc: ['https://ethereum-rpc.publicnode.com'],
        features: [{ name: 'EIP155' }, { name: 'EIP1559' }],
        nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
        infoURL: 'https://ethereum.org',
        shortName: 'eth',
        chainId: 1,
        networkId: 1,
        slip44: 60,
        ens: { registry: '0x00000000000C2E074eC69A0dFb2997BA6C7d2e1e' },
        explorers: [{ name: 'etherscan', url: 'https://etherscan.io', standard: 'EIP3091' }]
    },
    {
        name: 'Optimism',
        chain: 'ETH',

        rpc: ['https://optimism-rpc.publicnode.com'],
        nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
        infoURL: 'https://optimism.io',
        shortName: 'oeth',
        chainId: 10,
        networkId: 10,
        explorers: [
            { name: 'etherscan', url: 'https://optimistic.etherscan.io', standard: 'EIP3091' }
        ]
    },
    {
        name: 'Gnosis',
        chain: 'GNO',
        rpc: ['https://gnosis-rpc.publicnode.com'],
        nativeCurrency: { name: 'xDAI', symbol: 'XDAI', decimals: 18 },
        infoURL: 'https://docs.gnosischain.com',
        shortName: 'gno',
        chainId: 100,
        networkId: 100,
        slip44: 700,
        explorers: [{ name: 'gnosisscan', url: 'https://gnosisscan.io', standard: 'EIP3091' }]
    },
    {
        name: 'Polygon',
        chain: 'Polygon',
        rpc: ['https://polygon-bor-rpc.publicnode.com'],
        faucets: [],
        nativeCurrency: { name: 'POL', symbol: 'POL', decimals: 18 },
        infoURL: 'https://polygon.technology/',
        shortName: 'pol',
        chainId: 137,
        networkId: 137,
        slip44: 966,
        explorers: [{ name: 'polygonscan', url: 'https://polygonscan.com', standard: 'EIP3091' }]
    },
    {
        name: 'Fantom Opera',
        chain: 'FTM',
        rpc: ['https://fantom-rpc.publicnode.com'],
        faucets: [],
        nativeCurrency: { name: 'Fantom', symbol: 'FTM', decimals: 18 },
        infoURL: 'https://fantom.foundation',
        shortName: 'ftm',
        chainId: 250,
        networkId: 250,
        explorers: [
            { name: 'ftmscan', url: 'https://ftmscan.com', icon: 'ftmscan', standard: 'EIP3091' }
        ]
    },
    // {
    //     name: 'zkSync ',
    //     chain: 'ETH',
    //     rpc: ['https://zksync-rpc.publicnode.com'],
    //     faucets: [],
    //     nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
    //     infoURL: 'https://zksync.io/',
    //     shortName: 'zksync',
    //     chainId: 324,
    //     networkId: 324,
    //     explorers: [{ name: 'zkSync Era Block Explorer', url: 'https://explorer.zksync.io' }],
    //     parent: { type: 'L2', chain: 'eip155-1', bridges: [{ url: 'https://bridge.zksync.io/' }] }
    // },
    {
        name: 'Mantle',
        chain: 'ETH',
        rpc: ['https://mantle-rpc.publicnode.com'],
        faucets: [],
        nativeCurrency: { name: 'Mantle', symbol: 'MNT', decimals: 18 },
        infoURL: 'https://mantle.xyz',
        shortName: 'mantle',
        chainId: 5000,
        networkId: 5000,
        explorers: [{ name: 'mantlescan', url: 'https://mantlescan.xyz' }],
        parent: { type: 'L2', chain: 'eip155-1', bridges: [{ url: 'https://bridge.mantle.xyz' }] }
    },
    {
        name: 'Celo',
        chainId: 42220,
        shortName: 'celo',
        chain: 'CELO',
        networkId: 42220,
        nativeCurrency: { name: 'CELO', symbol: 'CELO', decimals: 18 },
        rpc: ['https://celo-rpc.publicnode.com'],
        faucets: [],
        infoURL: 'https://docs.celo.org/',
        explorers: [{ name: 'Celoscan', url: 'https://celoscan.io' }]
    },
    {
        name: 'Avalanche C-Chain',
        chain: 'AVAX',
        rpc: ['https://avalanche-c-chain-rpc.publicnode.com'],
        features: [{ name: 'EIP1559' }],
        faucets: [],
        nativeCurrency: { name: 'Avalanche', symbol: 'AVAX', decimals: 18 },
        infoURL: 'https://www.avax.network/',
        shortName: 'avax',
        chainId: 43114,
        networkId: 43114,
        slip44: 9005,
        explorers: [{ name: 'Etherscan', url: 'https://snowscan.xyz' }]
    },
    {
        name: 'Scroll',
        chain: 'ETH',
        status: 'active',
        rpc: ['https://scroll-rpc.publicnode.com'],
        faucets: [],
        nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
        infoURL: 'https://scroll.io',
        shortName: 'scr',
        chainId: 534352,
        networkId: 534352,
        explorers: [{ name: 'Scrollscan', url: 'https://scrollscan.com' }],
        parent: { type: 'L2', chain: 'eip155-1', bridges: [{ url: 'https://scroll.io/bridge' }] }
    },
    {
        name: 'Arbitrum One',
        chainId: 42161,
        shortName: 'arb1',
        chain: 'ETH',
        networkId: 42161,
        nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
        rpc: ['https://arbitrum-one-rpc.publicnode.com'],
        faucets: [],
        explorers: [{ name: 'Arbiscan', url: 'https://arbiscan.io' }],
        infoURL: 'https://arbitrum.io',
        parent: { type: 'L2', chain: 'eip155-1', bridges: [{ url: 'https://bridge.arbitrum.io' }] }
    },
    {
        name: 'Base',
        chain: 'ETH',
        rpc: ['https://base-rpc.publicnode.com'],
        faucets: [],
        nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
        infoURL: 'https://base.org',
        shortName: 'base',
        chainId: 8453,
        networkId: 8453,
        explorers: [{ name: 'basescan', url: 'https://basescan.org' }]
    }
];

/**
 * Get the URI of the chain icon
 * @param chainId - The chain ID
 * @returns The URI of the chain icon
 */
export const getChainIconUri = (chainId: number): Uri | undefined => {
    const context = SakeContext.getInstance();
    const webviewProvider = context.webviewProvider;

    if (!webviewProvider) {
        console.warn(`Icon URI can not be found for chain ${chainId}, webviewProvider not found`);
        return undefined;
    }

    const iconUri = webviewProvider.getMediaUri(`chains/${chainId}.png`);

    if (!iconUri) {
        console.warn(`Icon URI can not be found for chain ${chainId}, iconUri not found`);
        return undefined;
    }

    // Check if the icon exists
    // const iconPath = iconUri.fsPath;
    // if (!fs.existsSync(iconPath)) {
    //     console.warn(`Icon not found for chain ${chainId}: ${iconPath}`);
    //     return undefined;
    // }

    return iconUri;
};

export const getChainPreconfigs = (): ChainPreconfig[] => {
    return defaultChainList.map((chain) => ({
        ...chain,
        iconUri: getChainIconUri(chain.chainId)?.toString() ?? undefined
    }));
};
