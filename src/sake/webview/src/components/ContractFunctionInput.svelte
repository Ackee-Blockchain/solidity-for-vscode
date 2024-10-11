<script lang="ts">
    import ExpandButton from './icons/ExpandButton.svelte';
    import PlusButton from './icons/PlusButton.svelte';
    import MinusButton from './icons/MinusButton.svelte';
    import IconSpacer from './icons/IconSpacer.svelte';
    import {
        DynamicListInputHandler,
        InputHandler,
        InputTypesInternal
    } from '../helpers/FunctionInputsHandler';
    import InputIssueIndicator from './InputIssueIndicator.svelte';
    import { getInputFromTopBar } from '../helpers/api';

    export let input: InputHandler;
    export let onInputStateChange: () => void;
    export let expandable: boolean = true;

    const openFullTextInputEditor = async function () {
        const newValue = await getInputFromTopBar('', input.description);
        newValue && input.set(newValue.value ?? '');
        input = input;
    };

    // @dev silence warning
    const inputAsDynamicList = () => {
        return input as DynamicListInputHandler;
    };

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
        <div class="self-start w-[26px]">
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
                <!-- {#if input.isInvalid()}
                    <InputIssueIndicator type="danger">
                        {#key input.errors}
                            {#each input.errors as error}
                                <span class="text-sm">{error}</span>
                            {/each}
                        {/key}
                    </InputIssueIndicator>
                {:else if input.isMissingData()}
                    <InputIssueIndicator type="warning">
                        <span class="text-sm">Input is missing some data</span>
                    </InputIssueIndicator>
                {/if} -->
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
            <vscode-text-field
                class="flex-1 w-full {input.isInvalid() ? 'border-red-500' : ''}"
                placeholder={input.description}
                value={input.getString()}
                on:change={handleInput}
            >
                <div slot="end" class="flex items-center">
                    {#if input.isInvalid()}
                        <InputIssueIndicator type="danger">
                            {#key input.errors}
                                {#each input.errors as error}
                                    <span class="text-sm">{error}</span>
                                {/each}
                            {/key}
                        </InputIssueIndicator>
                    {:else if input.isMissingData()}
                        <InputIssueIndicator type="warning">
                            <span class="text-sm">Input is missing some data</span>
                        </InputIssueIndicator>
                    {:else}
                        <div class="relative inline-block">
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
                </div>
            </vscode-text-field>
        </div>
    {/if}
</div>
