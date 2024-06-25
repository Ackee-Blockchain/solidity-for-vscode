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
            >
                {#if input.isInvalid()}
                    <div slot="end" class="relative inline-block group">
                        <span class="text-vscodeError cursor-pointer">
                            <svg
                                width="16"
                                height="16"
                                viewBox="0 0 16 16"
                                xmlns="http://www.w3.org/2000/svg"
                                fill="currentColor"
                                ><path
                                    fill-rule="evenodd"
                                    clip-rule="evenodd"
                                    d="M7.56 1h.88l6.54 12.26-.44.74H1.44L1 13.26 7.56 1zM8 2.28L2.28 13H13.7L8 2.28zM8.625 12v-1h-1.25v1h1.25zm-1.25-2V6h1.25v4h-1.25z"
                                /></svg
                            >
                        </span>

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
                    <!-- {:else if input.isValid()}
                    <div slot="end" class="relative inline-block group">
                        <span class="text-emerald-400">
                            <svg
                                width="16"
                                height="16"
                                viewBox="0 0 16 16"
                                xmlns="http://www.w3.org/2000/svg"
                                fill="currentColor"
                                ><path
                                    fill-rule="evenodd"
                                    clip-rule="evenodd"
                                    d="M14.431 3.323l-8.47 10-.79-.036-3.35-4.77.818-.574 2.978 4.24 8.051-9.506.764.646z"
                                /></svg
                            >
                        </span>
                    </div> -->
                {:else}
                    <div slot="end" class="relative inline-block group">
                        <!-- svelte-ignore a11y-click-events-have-key-events -->
                        <span class="cursor-pointer" on:click={openFullTextInputEditor}>
                            <svg
                                width="16"
                                height="16"
                                xmlns="http://www.w3.org/2000/svg"
                                fill="currentColor"
                                ><path d="M10 8a2 2 0 1 1-4 0 2 2 0 0 1 4 0z" /></svg
                            >
                        </span>
                    </div>
                {/if}
            </vscode-text-field>
            <!-- {#if input.isInvalid()}

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
            {:else}
                <KebabButton callback={openFullTextInputEditor} />
            {/if} -->
        </div>
    {/if}
    <!-- Kebab at the end for additional functionality (i.e. input edit in InputBox) -->
</div>
