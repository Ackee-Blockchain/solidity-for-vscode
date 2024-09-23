interface NetworkState {
    accounts: string[];
    deployedContracts: string[];
}

export abstract interface INetworkProvider {
    name: string?;
    addAccount(account: string): boolean;
    removeAccount(account: string): boolean;
    deploy(contract: string): boolean;
    get state(): NetworkState;
}

export NetworkProvider {
    name: string?;

}

export LocalNodeNetworkProvider {

}

export class NetworksProvider {
    supportedNetworks = [
        {
            name: 'Local Node',

        }
    ]
        'Local Node',
        'Network'
    }
}