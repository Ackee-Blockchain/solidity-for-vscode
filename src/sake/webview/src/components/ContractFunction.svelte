<script lang="ts">
    import {
        provideVSCodeDesignSystem,
        vsCodeButton,
        vsCodeTextField,
    } from "@vscode/webview-ui-toolkit";
  import ContractFunctionInput from "./ContractFunctionInput.svelte";
  import { onMount } from 'svelte';
  import ExpandButton from "./icons/ExpandButton.svelte";
  import KebabButton from "./icons/KebabButton.svelte";
  import { buildTree, RootInputHandler } from "../helpers/FunctionInputsHandler";
  import IconSpacer from "./icons/IconSpacer.svelte";
  import { messageHandler } from '@estruyf/vscode/dist/client'
  import { type ContractFunction as ContractFunctionType, type Contract, type FunctionCallPayload, WebviewMessage } from "../../shared/types";

    provideVSCodeDesignSystem().register(
        vsCodeButton(),
        vsCodeTextField(),
    );

    export let func: ContractFunctionType;
    export let onFunctionCall: (calldata: string, func: ContractFunctionType) => void;
    export let isConstructor: boolean = false;
    let expanded: boolean;
    let hasInputs: boolean;
    let input: RootInputHandler;
    $: funcChanged(func)

    const funcChanged = (func: ContractFunctionType) => {
        hasInputs = func.inputs ? func.inputs.length > 0 : false;
        input = buildTree(func);
        expanded = false;
        console.log(func.name, func);
    }

    // onMount(() => {
    //     hasInputs = func.inputs && func.inputs.length > 0;
    //     input = buildTree(func.inputs);
    // });

    async function submit() {
        // console.log("submitting function call");
        // console.log('input', input.get());
        // console.log('input', input);
        // const payload: FunctionCallPayload = {
        //     contract: contract,
        //     function: func.name!,
        //     arguments: input.get()!
        // }
        // await messageHandler.send("onContractFunctionCall", payload);
        // onFunctionCall(input.get());
        let _encodedInput: string;
        try {
            _encodedInput = isConstructor ? input.encodedParameters() : input.calldata();
        } catch (e) {
            const errorMessage = typeof e === "string" ? e : (e as Error).message;
            const message = `Failed to encode input with error: ${errorMessage}`;
            messageHandler.send(WebviewMessage.onError, message)
            return;
        }

        console.log("encoded input", isConstructor, _encodedInput);
        onFunctionCall(_encodedInput, func)
    }

    // TODO rename
    const openFullTextInputEditor = async function() {
        const newValue = await messageHandler.request<any>("getTextFromInputBox", input.get());
        newValue && input.set(newValue);
        input = input;
    }

    const handleInput = (e: Event) => {
        const target = e.target as HTMLInputElement;
        input.set(target.value);
        input = input;
    }

</script>

{#if expanded}
    <div class="flex flex-col gap-1">
        <div class="flex flex-row items-center gap-1">
            <ExpandButton bind:expanded={expanded} />
            <!-- svelte-ignore a11y-click-events-have-key-events -->
            <vscode-button class="flex-1" on:click={submit}>{func.name}</vscode-button>
            <KebabButton callback={() => {}} />
        </div>
        {#if func.inputs && func.inputs.length > 0}
            <!-- TODO: add blank button spacer -->
            <div class="ml-[29px] flex flex-col gap-1">
                {#each input.children as child}
                    <!-- <vscode-text-field placeholder={input.type} class="ml-[29px]"/> -->
                    <ContractFunctionInput input={child}/>
                {/each}
            </div>
        {/if}
    </div>
{:else}
<div class="flex flex-row items-center gap-1">
    {#if hasInputs}
        <ExpandButton bind:expanded={expanded} />
        <!-- svelte-ignore a11y-click-events-have-key-events -->
        <vscode-button class="flex-1" on:click={submit}>{func.name}</vscode-button>
        <vscode-text-field class="flex-1" placeholder={input.description()} value={input.get()} on:change={handleInput} />
    {:else}
        <IconSpacer />
        <!-- svelte-ignore a11y-click-events-have-key-events -->
        <vscode-button class="flex-1" on:click={submit}>{func.name}</vscode-button>
    {/if}
    <KebabButton callback={() => {openFullTextInputEditor()}} />
</div>
{/if}

