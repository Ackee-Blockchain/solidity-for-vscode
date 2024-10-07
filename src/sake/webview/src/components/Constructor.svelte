<script lang="ts">
    import type { ContractAbi, AbiConstructorFragment } from '../../shared/types';
    import ContractFunction from './ContractFunction.svelte';

    export let abi: ContractAbi | undefined;
    export let onDeploy: (calldata: string) => void;
    export let onOpenDeploymentInBrowser: (calldata: string) => void;
    export let name: string;
    let constructor: AbiConstructorFragment | undefined;
    let deployFunction: ContractFunction;
    $: getConstructor(abi);

    const getConstructor = function (_abi: ContractAbi | undefined) {
        if (_abi === undefined) {
            constructor = undefined;
            return;
        }

        const constructors = _abi.filter(
            (f) => f.type === 'constructor'
        ) as AbiConstructorFragment[]; // TODO throws type errors

        if (constructors.length > 1) {
            constructor = undefined;
            throw new Error('Invalid number of constructors');
        }

        if (constructors.length === 0) {
            constructor = {
                inputs: [],
                stateMutability: 'unpayable',
                type: 'constructor',
                name: name
            };
            return;
        } else {
            constructor = constructors[0];
        }

        constructor.name = name;
    };
</script>

{#if constructor}
    <ContractFunction
        bind:this={deployFunction}
        func={constructor}
        onFunctionCall={onDeploy}
        isConstructor={true}
        {onOpenDeploymentInBrowser}
    />
{/if}
