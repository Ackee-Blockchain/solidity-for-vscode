<script lang="ts">
    import {
        provideVSCodeDesignSystem,
        vsCodeTextField,
        vsCodeButton
    } from '@vscode/webview-ui-toolkit';
    import IconButton from './IconButton.svelte';
    import ExpandButton from './icons/ExpandButton.svelte';
    import DeleteButton from './icons/DeleteButton.svelte';
    import CopyButton from './icons/CopyButton.svelte';
    import type {
        Contract,
        ContractAbi,
        ContractFunction as ContractFunctionType
    } from '../../shared/types';
    import ContractFunction from './ContractFunction.svelte';

    provideVSCodeDesignSystem().register(vsCodeButton(), vsCodeTextField());

    export let abi: ContractAbi | undefined;
    export let onDeploy: (calldata: string) => void;
    export let name: string | undefined;
    let constructor: ContractFunctionType | undefined;
    let deployFunction: ContractFunction;
    $: getConstructor(abi);

    const getConstructor = function (_abi: ContractAbi | undefined) {
        if (_abi === undefined) {
            constructor = undefined;
            return;
        }

        const constructors = _abi.filter((f) => f.type === 'constructor');

        if (constructors.length > 1) {
            constructor = undefined;
            throw new Error('Invalid number of constructors');
        }

        if (constructors.length === 0) {
            constructor = {
                inputs: [],
                outputs: [],
                stateMutability: 'unpayable',
                type: 'constructor',
                name: 'Deploy'
            };
            return;
        }

        const _constructor = constructors[0];
        _constructor.name = name ?? 'Deploy';
        constructor = _constructor;
    };
</script>

{#if constructor}
    <ContractFunction
        bind:this={deployFunction}
        func={constructor}
        onFunctionCall={onDeploy}
        isConstructor={true}
    />
{/if}
