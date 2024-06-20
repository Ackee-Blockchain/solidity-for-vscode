<script lang="ts">
    import {
        provideVSCodeDesignSystem,
        vsCodeButton,
        vsCodeTextField
    } from '@vscode/webview-ui-toolkit';
    import { onMount } from 'svelte';
    import ExpandButton from './icons/ExpandButton.svelte';
    import PlusButton from './icons/PlusButton.svelte';
    import MinusButton from './icons/MinusButton.svelte';
    import IconSpacer from './icons/IconSpacer.svelte';
    import KebabButton from './icons/KebabButton.svelte';
    import { messageHandler } from '@estruyf/vscode/dist/client';
    import {
        DynamicListInputHandler,
        InputHandler,
        InputTypesInternal
    } from '../helpers/FunctionInputsHandler';
    import { WebviewMessage } from '../../shared/types';

    provideVSCodeDesignSystem().register(vsCodeButton(), vsCodeTextField());

    export let input: InputHandler;
    export let onInputStateChange: () => void;

    const openFullTextInputEditor = async function () {
        const newValue = await messageHandler.request<string>(
            WebviewMessage.getTextFromInputBox,
            input.getString()
        );
        newValue && input.set(newValue);
        input = input;
    };

    // @dev silence warning
    const inputAsDynamicList = () => {
        return input as DynamicListInputHandler;
    };

    onMount(() => {
        console.log('mounting', input.name, input.type);
    });

    const handleInput = (e: Event) => {
        const target = e.target as HTMLInputElement;
        try {
            const _stateBefore = input.state;
            input.set(target.value);
            if (_stateBefore !== input.state) {
                onInputStateChange();
            }
        } catch (e) {
            const errorMessage = typeof e === 'string' ? e : (e as Error).message;
            const message = `Unexpected error setting input state: ${errorMessage}`;
            console.error(message);
            return;
        }
        input = input;
    };
</script>

<div class="flex flex-row items-start gap-1">
    <!-- Start of row -->
    {#if input.internalType === InputTypesInternal.LEAF}
        <IconSpacer />
    {:else}
        <ExpandButton bind:expanded={input.expanded} />
    {/if}

    <!-- Input box -->
    {#if input.expanded}
        <div class="flex flex-col flex-1 gap-1">
            <div class="h-[28px] flex items-center">
                <p class="text-md flex-1">{input.description}</p>
                {#if input.internalType == InputTypesInternal.DYNAMIC_LIST}
                    <PlusButton
                        callback={() => {
                            inputAsDynamicList().addElement();
                            input = input;
                        }}
                    />
                    <MinusButton
                        callback={() => {
                            inputAsDynamicList().removeElement();
                            input = input;
                        }}
                    />
                {/if}
            </div>
            <!-- Static or dynamic list -->
            {#key input.children}
                {#each input.children as child}
                    <svelte:self input={child} {onInputStateChange} />
                {/each}
            {/key}
        </div>
    {:else}
        <div class="flex flex-col gap-1">
            <div class="w-full">
                <vscode-text-field
                    class="flex-1 {input.isInvalid() ? 'border-red-500' : ''}"
                    placeholder={input.description}
                    value={input.getString()}
                    on:change={handleInput}
                />
                <KebabButton callback={openFullTextInputEditor} />
            </div>

            {#key input.errors}
                {#each input.errors as error}
                    <span class="text-xs text-red-500 w-full">{error}</span>
                {/each}
            {/key}
        </div>
    {/if}
    <!-- Kebab at the end for additional functionality (i.e. input edit in InputBox) -->
</div>
