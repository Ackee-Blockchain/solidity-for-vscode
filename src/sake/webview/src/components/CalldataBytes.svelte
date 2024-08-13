<script lang="ts">
    import {
        provideVSCodeDesignSystem,
        vsCodeTextField,
        vsCodeButton
    } from '@vscode/webview-ui-toolkit';
    import ContractFunction from './ContractFunction.svelte';
    import IconButton from './IconButton.svelte';
    import ExpandButton from './icons/ExpandButton.svelte';
    import DeleteButton from './icons/DeleteButton.svelte';
    import CopyButton from './icons/CopyButton.svelte';
    import {
        WebviewMessage,
        type Contract,
        type WakeCallRequestParams,
        type ContractFunction as ContractFunctionType,
        type DeploymentStateData
    } from '../../shared/types';
    import { messageHandler } from '@estruyf/vscode/dist/client';
    import { copyToClipboard, removeContract } from '../helpers/api';
    import ContractFunctionInput from './ContractFunctionInput.svelte';

    provideVSCodeDesignSystem().register(vsCodeButton(), vsCodeTextField());

    export let func: ContractFunctionType = {
        inputs: [
            {
                name: 'calldata',
                type: 'bytes',
                internalType: 'bytes',
                components: undefined
            }
        ],
        stateMutability: 'payable',
        type: 'function',
        outputs: undefined,
        name: 'calldata'
    };
    export let onFunctionCall: (calldata: string, func: ContractFunctionType) => void;
</script>

<ContractFunction {func} {onFunctionCall} isCalldata={true} />
