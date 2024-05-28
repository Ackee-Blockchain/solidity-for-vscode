<script lang="ts">
    import {
        provideVSCodeDesignSystem,
        vsCodeButton,
        vsCodeTextField,
    } from "@vscode/webview-ui-toolkit";
    import { onMount } from 'svelte';
    import ExpandButton from "./icons/ExpandButton.svelte";
  import PlusButton from "./icons/PlusButton.svelte";
  import MinusButton from "./icons/MinusButton.svelte";
  import IconSpacer from "./icons/IconSpacer.svelte";
  import KebabButton from "./icons/KebabButton.svelte";
  import { messageHandler } from '@estruyf/vscode/dist/client'
  import { DynamicListInputHandler, InputHandler, InputTypesInternal } from "../helpers/FunctionInputsHandler";

    provideVSCodeDesignSystem().register(
        vsCodeButton(),
        vsCodeTextField(),
    );

    export let input: InputHandler;
    let expanded = false;

    const openFullTextInputEditor = async function() {
        const newValue = await messageHandler.request<any>("getTextFromInputBox", input.get());
        newValue && input.set(newValue);
        input = input;
    }

    // silence warning
    const inputAsDynamicList = () => {
        return input as DynamicListInputHandler;
    }
</script>

<div class="flex flex-row items-start gap-1">
    <!-- Start of row -->
    {#if input.internalType === InputTypesInternal.LEAF}
        <IconSpacer />
    {:else}
        <ExpandButton bind:expanded={expanded} />
    {/if}

    <!-- Input box -->
    {#if expanded}
        <div class="flex flex-col flex-1 gap-1">
            <div class="h-[28px] flex items-center">
                <p class="text-md flex-1">{input.description()}</p>
                {#if input.internalType == InputTypesInternal.DYNAMIC_LIST}
                    <PlusButton callback={() => {
                        inputAsDynamicList().addElement();
                        input = input;
                    }}/>
                    <MinusButton callback={() => {
                        inputAsDynamicList().removeElement();
                        input = input;
                    }}/>
                {/if}
            </div>
            <!-- Static or dynamic list -->
            {#key input.children}
                {#each input.children as child}
                    <svelte:self input={child}/>
                {/each}
            {/key}
        </div>
    {:else}
        <vscode-text-field class="flex-1" placeholder={input.description()} value={input.get()} on:change={e => {
            input.set(e.target.value);
            input = input;
            }} />
        <KebabButton callback={() => { openFullTextInputEditor(); }} />
    {/if}
    <!-- Kebab at the end for additional functionality (i.e. input edit in InputBox) -->
</div>
