<script lang="ts">
    import {
        provideVSCodeDesignSystem,
        vsCodeButton,
        vsCodeTextField
    } from '@vscode/webview-ui-toolkit';
    import ContractFunctionInput from './ContractFunctionInput.svelte';
    import { onMount } from 'svelte';
    import ExpandButton from './icons/ExpandButton.svelte';
    import KebabButton from './icons/KebabButton.svelte';
    import { buildTree, RootInputHandler } from '../helpers/FunctionInputsHandler';
    import IconSpacer from './icons/IconSpacer.svelte';
    import { messageHandler } from '@estruyf/vscode/dist/client';
    import {
        type ContractFunction as ContractFunctionType,
        type Contract,
        type CallPayload,
        WebviewMessage
    } from '../../shared/types';
    import { children } from 'svelte/internal';

    provideVSCodeDesignSystem().register(vsCodeButton(), vsCodeTextField());

    export let func: ContractFunctionType;
    export let onFunctionCall: (calldata: string, func: ContractFunctionType) => void;
    export let isConstructor: boolean = false;
    export let isCalldata: boolean = false;
    let expanded: boolean = false;
    let inputRoot: RootInputHandler;
    $: funcChanged(func);

    const funcChanged = (_func: ContractFunctionType) => {
        inputRoot = buildTree(_func);
        expanded = false;
    };

    async function submit() {
        let _encodedInput: string;
        try {
            if (isCalldata) {
                _encodedInput = inputRoot.rawCalldata();
                // console.log('calldata', _encodedInput, func);
            } else if (isConstructor) {
                _encodedInput = inputRoot.encodedParameters();
                // console.log('constructor', _encodedInput, func);
            } else {
                _encodedInput = inputRoot.calldata();
                // console.log('function', _encodedInput, func);
            }
        } catch (e) {
            const errorMessage = typeof e === 'string' ? e : (e as Error).message;
            const message = `Failed to encode input with error: ${errorMessage}`;
            messageHandler.send(WebviewMessage.onError, message);
            return;
        }

        onFunctionCall(_encodedInput, func);
    }
</script>

<div class="flex flex-1 w-full items-end gap-1 {expanded ? 'flex-col' : 'flex-row'}">
    <div class="flex flex-1 gap-1 {expanded ? 'w-full' : ''}">
        {#if inputRoot.hasInputs()}
            <ExpandButton bind:expanded />
            <!-- {:else if !isConstructor} -->
        {:else}
            <IconSpacer />
        {/if}
        <!-- svelte-ignore a11y-click-events-have-key-events -->
        <vscode-button
            class="flex-1"
            on:click={submit}
            appearance={isCalldata ? 'secondary' : 'primary'}>{func.name}</vscode-button
        >
    </div>
    {#if inputRoot.hasInputs()}
        <div class="flex flex-1 flex-col gap-1 {expanded ? 'w-full' : ''}">
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
    <!-- <KebabButton callback={openFullTextInputEditor} /> -->
</div>
