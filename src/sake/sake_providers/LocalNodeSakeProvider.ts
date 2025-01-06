import { LocalNodeNetworkProvider } from '../network/LocalNodeNetworkProvider';
import { fingerprint } from '../utils/hash';
import { SakeError } from '../webview/shared/errors';
import {
    SakeLocalNodeProviderInitializationRequest,
    SakeProviderInitializationRequestType,
    SakeProviderType,
    ProviderState as StoredProviderState,
    WakeChainDump
} from '../webview/shared/storage_types';
import { ChainPersistence, SetAccountLabelRequest } from '../webview/shared/types';
import { BaseSakeProvider } from './BaseSakeProvider';

export class LocalNodeSakeProvider extends BaseSakeProvider<LocalNodeNetworkProvider> {
    constructor(
        id: string,
        displayName: string,
        network: LocalNodeNetworkProvider,
        initializationRequest: SakeLocalNodeProviderInitializationRequest,
        persistence: ChainPersistence
    ) {
        super(
            SakeProviderType.LocalNode,
            id,
            displayName,
            network,
            initializationRequest,
            persistence
        );
    }

    async _connect(): Promise<void> {
        if (this.connected) {
            throw new SakeError('Cannot connect, already connected');
        }

        switch (this.initializationRequest.type) {
            case SakeProviderInitializationRequestType.CreateNew:
                await this.network.createChain(this.initializationRequest.accounts);
                const accounts = await this.network.getAccounts();
                for (const account of accounts) {
                    const accountDetails = await this.network.getAccountDetails(account);
                    if (accountDetails) {
                        this.chainState.accounts.add(accountDetails);
                    }
                }
                break;

            case SakeProviderInitializationRequestType.LoadFromState:
                if (this.initializationRequest.state.type !== SakeProviderType.LocalNode) {
                    throw new Error('Invalid initialization request type for local node provider');
                }

                await this.network.createChain();
                await this.network.loadState(this.initializationRequest.state.network.wakeDump);
                this.chainState.loadStateFrom(this.initializationRequest.state.state);
                break;

            default:
                throw new Error('Invalid initialization request type for local node provider');
        }

        this.connected = true;
    }

    async _reconnect(): Promise<void> {
        if (this.connected) {
            throw new SakeError('Cannot reconnect, already connected');
        }

        const savedState = await this.getSavedState();
        if (savedState !== undefined && savedState.type !== SakeProviderType.LocalNode) {
            throw new Error('Invalid saved state type for local node provider');
        }

        await this.network.createChain();

        // check if state if dirty
        if (this.persistence.isDirty) {
            if (this.persistence.lastSaveTimestamp !== undefined) {
                if (!savedState) {
                    console.error('No saved state found during reconnect');
                    return;
                }

                await this.network.loadState(savedState.network.wakeDump);
                this.chainState.loadStateFrom(savedState.state);

                this.sendNotificationToWebview({
                    notificationHeader: 'Chain state partially restored',
                    notificationBody:
                        'The chain was disconnected. Your last saved state has been restored successfully from last save.'
                });
            } else {
                this.chainState.reset();
                this.sendNotificationToWebview({
                    notificationHeader: 'Chain state was lost',
                    notificationBody:
                        'The chain was disconnected and no saved state was found. The chain has been reset to its initial state.'
                });
            }
        } else {
            if (this.persistence.lastSaveTimestamp !== undefined) {
                if (!savedState) {
                    console.error('No saved state found during reconnect');
                    return;
                }

                // reload state in wake
                await this.network.createChain();
                await this.network.loadState(savedState.network.wakeDump);
                this.chainState.loadStateFrom(savedState.state);
            } else {
                // no state to reload
            }
        }

        this.connected = true;
    }

    async dumpState(): Promise<StoredProviderState> {
        const providerState = this.chainState.dumpState();
        return {
            type: SakeProviderType.LocalNode,
            id: this.id,
            displayName: this.displayName,
            state: providerState,
            network: await this.network.dumpState(),
            stateFingerprint: fingerprint(providerState),
            persistence: this.persistence
        };
    }

    /* Overrides */

    async setAccountLabel(request: SetAccountLabelRequest) {
        super.setAccountLabel(request);
        try {
            await this.network.setAccountLabel(request);
        } catch (e) {
            console.error('Set account label error', e);
        }
    }
}
