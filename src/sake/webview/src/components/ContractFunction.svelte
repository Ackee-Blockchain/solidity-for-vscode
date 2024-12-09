<script lang="ts">
    import ContractFunctionInput from './ContractFunctionInput.svelte';
    import ExpandButton from './icons/ExpandButton.svelte';
    import KebabButton from './icons/KebabButton.svelte';
    import { buildTree, RootInputHandler } from '../helpers/FunctionInputsHandler';
    import IconSpacer from './icons/IconSpacer.svelte';
    import { type AbiFunctionFragment } from '../../shared/types';
    import { showErrorMessage } from '../helpers/api';
    import RadioTowerIcon from './icons/RadioTowerIcon.svelte';

    export let func: AbiFunctionFragment;
    export let onFunctionCall: (calldata: string, func: AbiFunctionFragment) => void;
    export let isConstructor: boolean = false;
    export let isCalldata: boolean = false;
    export let isProxy: boolean = false;
    let expanded: boolean = false;
    let inputRoot: RootInputHandler;
    $: funcChanged(func);
    $: allowEmptyInput = isCalldata;

    const funcChanged = (_func: AbiFunctionFragment) => {
        inputRoot = buildTree(_func);
        expanded = false;
    };

    const getEncodedInput = () => {
        if (isCalldata) {
            return inputRoot.rawCalldata(allowEmptyInput);
        } else if (isConstructor) {
            return inputRoot.encodedParameters();
        } else {
            return inputRoot.calldata();
        }
    };

    async function _onFunctionCall() {
        let _encodedInput: string;
        try {
            _encodedInput = getEncodedInput();
        } catch (e) {
            const errorMessage = typeof e === 'string' ? e : (e as Error).message;
            const message = `Failed to encode input with error: ${errorMessage}`;
            showErrorMessage(message);
            return;
        }

        onFunctionCall(_encodedInput, func);
    }
</script>

<div class="flex flex-1 w-full items-end gap-1 {expanded ? 'flex-col' : 'flex-row'}">
    <div class="flex flex-1 gap-1 {expanded ? 'w-full' : ''} overflow-hidden">
        {#if inputRoot.hasInputs()}
            <ExpandButton bind:expanded />
            <!-- {:else if !isConstructor} -->
        {:else}
            <IconSpacer />
        {/if}
        <!-- svelte-ignore a11y-click-events-have-key-events -->
        <vscode-button
            class="flex-1"
            on:click={_onFunctionCall}
            appearance={isCalldata ? 'secondary' : 'primary'}
        >
            {#if isProxy}
                <span slot="start">
                    <RadioTowerIcon />
                </span>
            {/if}
            {func.name}
        </vscode-button>
    </div>
    {#if inputRoot.hasInputs()}
        <div class="flex flex-1 flex-col gap-1 {expanded ? 'w-full' : ''} overflow-hidden">
            {#if inputRoot.isMultiInput() && expanded}
                <!-- TODO: add blank button spacer -->
                {#each inputRoot.inputs.children as input}
                    <!-- <vscode-text-field placeholder={input.type} class="ml-[29px]"/> -->
                    <ContractFunctionInput
                        {input}
                        onInputStateChange={() => {
                            inputRoot = inputRoot;
                        }}
                    />
                {/each}
            {:else}
                <ContractFunctionInput
                    input={inputRoot.inputs}
                    onInputStateChange={() => {
                        inputRoot = inputRoot;
                    }}
                    expandable={expanded}
                />
            {/if}
        </div>
    {/if}
</div>
