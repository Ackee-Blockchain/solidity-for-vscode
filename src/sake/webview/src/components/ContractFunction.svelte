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
        type FunctionCallPayload,
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
            // if isCalldata
            _encodedInput = isConstructor ? inputRoot.encodedParameters() : inputRoot.calldata();
        } catch (e) {
            const errorMessage = typeof e === 'string' ? e : (e as Error).message;
            const message = `Failed to encode input with error: ${errorMessage}`;
            messageHandler.send(WebviewMessage.onError, message);
            return;
        }

        console.log('encoded input', isConstructor, _encodedInput);
        onFunctionCall(_encodedInput, func);
    }

    // TODO rename
    const openFullTextInputEditor = async function () {
        const newValue = await messageHandler.request<string>(
            WebviewMessage.getTextFromInputBox,
            inputRoot.getString()
        );
        newValue && inputRoot.set(newValue);
        inputRoot = inputRoot;
    };
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
        <vscode-button class="flex-1" on:click={submit}>{func.name}</vscode-button>
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
