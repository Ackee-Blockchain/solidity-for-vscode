import { LocalNodeNetworkProvider } from '../network/LocalNodeNetworkProvider';
import { fingerprint } from '../utils/hash';
import { SakeError } from '../webview/shared/errors';
import {
    SakeLocalNodeProviderInitializationRequest,
    SakeProviderInitializationRequestType,
    SakeProviderType,
    ProviderState as StoredProviderState
} from '../webview/shared/storage_types';
import { ChainPersistence, SetAccountLabelRequest } from '../webview/shared/types';
import { BaseSakeProvider } from './BaseSakeProvider';

export class ConnectionSakeProvider extends BaseSakeProvider<LocalNodeNetworkProvider> {
    constructor(
        id: string,
        displayName: string,
        network: LocalNodeNetworkProvider,
        initializationRequest: SakeLocalNodeProviderInitializationRequest,
        persistence: ChainPersistence
    ) {
        super(
            SakeProviderType.Connection,
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
                await this.network.connectChain();

                const accounts = await this.network.getAccounts();
                for (const account of accounts) {
                    const accountDetails = await this.network.getAccountDetails(account);
                    if (accountDetails) {
                        this.chainState.accounts.add(accountDetails);
                    }
                }
                break;

            case SakeProviderInitializationRequestType.LoadFromState:
                if (this.initializationRequest.state.type !== SakeProviderType.Connection) {
                    throw new Error('Invalid initialization request type for connection provider');
                }

                await this.network.connectChain();

                // @dev reloading state for connected provider is not supported

                // await this.network.loadState(this.initializationRequest.state.network.wakeDump);
                this.chainState.loadStateFrom(this.initializationRequest.state.state);
                break;

            default:
                throw new Error('Invalid initialization request type for connection provider');
        }

        this.connected = true;
    }

    async _reconnect(): Promise<void> {
        if (this.connected) {
            throw new SakeError('Cannot reconnect, already connected');
        }

        await this.network.connectChain();
        await this.chainState.reset();

        this.sendNotificationToWebview({
            notificationHeader: 'Chain state was lost',
            notificationBody:
                'The chain was disconnected and state could not be restored. The chain has been reset to its initial state.'
        });

        this.connected = true;
    }

    async dumpState(): Promise<StoredProviderState> {
        const providerState = this.chainState.dumpState();
        return {
            type: SakeProviderType.Connection,
            id: this.id,
            state: {
                accounts: providerState.accounts
            },
            stateFingerprint: fingerprint(providerState),
            displayName: this.displayName,
            network: await this.network.dumpState(false),
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
