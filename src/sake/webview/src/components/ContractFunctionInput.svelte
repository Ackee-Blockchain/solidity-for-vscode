<script lang="ts">
    import {
        provideVSCodeDesignSystem,
        vsCodeButton,
        vsCodeTextField,
        vsCodeTag
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
    import ErrorButton from './icons/ErrorButton.svelte';
    import TextContainer from './TextContainer.svelte';

    provideVSCodeDesignSystem().register(vsCodeButton(), vsCodeTextField(), vsCodeTag());

    export let input: InputHandler;
    export let onInputStateChange: () => void;
    export let expandable: boolean = true;

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

<div class="flex flex-1 flex-row items-end gap-1">
    <!-- Start of row -->
    {#if expandable}
        <div class="self-start">
            {#if input.internalType === InputTypesInternal.LEAF}
                <IconSpacer />
            {:else}
                <ExpandButton bind:expanded={input.expanded} />
            {/if}
        </div>
    {/if}

    <!-- Input box -->
    {#if expandable && input.expanded}
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
        <div class="w-full flex flex-1 flex-row gap-1">
            <!-- {#if input.isInvalid()}
                    <span class="text-xs text-red-500 w-full">
                        {input.errors.join(' • ')}
                    </span>
                {/if} -->
            <vscode-text-field
                class="flex-1 w-full {input.isInvalid() ? 'border-red-500' : ''}"
                placeholder={input.description}
                value={input.getString()}
                on:change={handleInput}
            />
            {#if input.isInvalid()}
                <!-- <span class="text-xs text-red-500 w-full">
                        {input.errors.join(' • ')}
                    </span> -->
                <div class="relative inline-block group">
                    <ErrorButton />
                    <div
                        class="absolute invisible group-hover:visible opacity-0 group-hover:opacity-100
                            right-full top-1/2 transform -translate-y-1/2 mr-2 w-max z-[999]"
                    >
                        <TextContainer warning={true}>
                            <div class="flex flex-col gap-1 text-sm">
                                {#key input.errors}
                                    {#each input.errors as error}
                                        <span class="text-sm">{error}</span>
                                    {/each}
                                {/key}
                            </div>
                        </TextContainer>
                    </div>
                </div>
                <!-- <vscode-tag class="text-xs text-red-500">{input.errors.join('\n')}</vscode-tag> -->
            {:else}
                <KebabButton callback={openFullTextInputEditor} />
            {/if}
        </div>
    {/if}
    <!-- Kebab at the end for additional functionality (i.e. input edit in InputBox) -->
</div>
