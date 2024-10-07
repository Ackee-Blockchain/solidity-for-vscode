<script lang="ts">
    import ContractFunction from './ContractFunction.svelte';
    import { type AbiFunctionFragment } from '../../shared/types';

    export let func: AbiFunctionFragment = {
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
    export let onFunctionCall: (calldata: string, func: AbiFunctionFragment) => void;
</script>

<ContractFunction {func} {onFunctionCall} isCalldata={true} />
