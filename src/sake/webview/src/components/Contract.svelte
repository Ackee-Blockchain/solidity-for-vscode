<script lang="ts">
    import {
        provideVSCodeDesignSystem,
        vsCodeTextField,
        vsCodeButton
    } from "@vscode/webview-ui-toolkit";
    import ContractFunction from "./ContractFunction.svelte";
    import IconButton from "./IconButton.svelte";
    import ExpandButton from "./icons/ExpandButton.svelte";
    import DeleteButton from "./icons/DeleteButton.svelte";
    import CopyButton from "./icons/CopyButton.svelte";
    import type { Contract } from "../../shared/types";
  import { messageHandler } from "@estruyf/vscode/dist/client";

    provideVSCodeDesignSystem().register(
        vsCodeButton(),
        vsCodeTextField(),
    );

    export let contract: Contract;
    let expanded = false;

    const undeploy = async function() {
        messageHandler.send("undeployContract", contract)
    }

</script>

{#if !expanded}
    <div class="flex flex-row gap-1">
        <ExpandButton bind:expanded={expanded} />
        <div class="flex-1 overflow-x-hidden bg-[#3c3c3c] rounded py-1 ps-1">
            <div class="w-full flex flex-row gap-1 items-center">
                <p class="">{contract.name}</p>
                <DeleteButton callback={undeploy} />
            </div>

            <div class="w-full flex flex-row gap-1 items-center">
                <span class="flex-1 truncate text-sm">{contract.address}</span>
                <CopyButton />
            </div>
        </div>
    </div>
{:else}
    <div class="flex flex-col gap-1">
        <div class="flex flex-row gap-1">
            <ExpandButton bind:expanded={expanded} />
            <div class="flex-1 overflow-x-hidden bg-[#3c3c3c] rounded py-1 px-2">
                <p class="">{contract.name}</p>
                <div class="w-full flex flex-row gap-1 items-center">
                    <span class="flex-1 truncate text-sm">{contract.address}</span>
                    <CopyButton />
                </div>
                <div class="flex flex-row gap-1 items-center">
                    <!-- <IconButton>
                        <svg width="16" height="16" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg" fill="currentColor"><path fill-rule="evenodd" clip-rule="evenodd" d="M4 4l1-1h5.414L14 6.586V14l-1 1H5l-1-1V4zm9 3l-3-3H5v10h8V7z"/><path fill-rule="evenodd" clip-rule="evenodd" d="M3 1L2 2v10l1 1V2h6.414l-1-1H3z"/></svg>
                    </IconButton> -->
                    <!-- <svg width="16" height="16" fill="#fff" viewBox="0 0 24 24" role="img" xmlns="http://www.w3.org/2000/svg"><g id="SVGRepo_bgCarrier" stroke-width="0"></g><g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"></g><g id="SVGRepo_iconCarrier"><path d="M11.944 17.97 4.58 13.62 11.943 24l7.37-10.38-7.372 4.35h.003zM12.056 0 4.69 12.223l7.365 4.354 7.365-4.35L12.056 0z"></path></g></svg> -->
                    <span class="text-sm">100 ETH</span>
                </div>
            </div>
        </div>
        <div class="flex flex-col gap-1">
            {#each contract.abi as func}
                {#if func.type == "function"}
                    <ContractFunction {func} onFunctionCall={()=>{}}/>
                {/if}
            {/each}
        </div>
    </div>
{/if}