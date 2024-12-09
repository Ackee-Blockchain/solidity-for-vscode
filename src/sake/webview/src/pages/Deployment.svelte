<script lang="ts">
    import FlexContainer from '../components/common/FlexContainer.svelte';
    import TransactionParameters from '../views/TransactionParameters.svelte';
    import {
        compilationIssuesVisible,
        compilationState,
        selectedAccount,
        selectedAccountId,
        selectedValue,
        txParametersExpanded
    } from '../helpers/stores';
    import { requestAddDeployedContract } from '../helpers/api';
    import Compile from '../views/Compile.svelte';
    import BlankIcon from '../components/icons/BlankIcon.svelte';
    import Deploy from '../views/Deploy.svelte';
    import ChevronDown from '../components/icons/ChevronDown.svelte';
    import ChevronRight from '../components/icons/ChevronRight.svelte';
    import ViewStatic from '../components/common/ViewStatic.svelte';
    import ViewScrollable from '../components/common/ViewScrollable.svelte';
    import { displayEtherValue } from '../../shared/ether';
    import PlusIcon from '../components/icons/PlusIcon.svelte';
    import HeaderButton from '../components/icons/HeaderButton.svelte';
    import BackIcon from '../components/icons/BackIcon.svelte';
    import CompilationIssues from '../components/CompilationIssues.svelte';
    import Tooltip from '../components/common/Tooltip.svelte';
</script>

<FlexContainer>
    <ViewStatic>
        <svelte:fragment slot="header">
            <BlankIcon />
            <span>Compile contracts</span>
        </svelte:fragment>
        <svelte:fragment slot="content">
            <Compile />
        </svelte:fragment>
    </ViewStatic>
    {#if $compilationIssuesVisible}
        <!-- svelte-ignore a11y-click-events-have-key-events -->
        <!-- svelte-ignore a11y-missing-attribute -->
        <ViewScrollable>
            <svelte:fragment slot="header">
                <div class="flex flex-row gap-1 items-center w-full">
                    <div class="flex flex-row gap-1 items-center">
                        <a
                            on:click={() => compilationIssuesVisible.set(false)}
                            class="flex gap-1 cursor-pointer items-center w-full"
                        >
                            <BackIcon />
                            <span>Compilation issues</span>
                        </a>
                    </div>
                </div>
            </svelte:fragment>
            <svelte:fragment slot="content">
                <CompilationIssues />
            </svelte:fragment>
        </ViewScrollable>
    {:else}
        <!-- svelte-ignore a11y-click-events-have-key-events -->
        <!-- svelte-ignore a11y-missing-attribute -->
        <ViewStatic>
            <svelte:fragment slot="header">
                <a
                    on:click={() => txParametersExpanded.set(!$txParametersExpanded)}
                    class="flex gap-1 cursor-pointer items-center w-full"
                >
                    {#if $txParametersExpanded}
                        <ChevronDown />
                        <span>Transaction Parameters</span>
                    {:else}
                        <ChevronRight />
                        <span>Transaction Parameters</span>

                        <span
                            class="text-xs text-vscodeForegroundSecondary font-normal ml-auto pr-2"
                        >
                            ({$selectedAccountId !== null
                                ? ($selectedAccount?.label ?? `Account ${$selectedAccountId}`)
                                : 'No account selected'},
                            {displayEtherValue($selectedValue)})
                        </span>
                    {/if}
                </a>
            </svelte:fragment>
            <svelte:fragment slot="content">
                <TransactionParameters />
            </svelte:fragment>
        </ViewStatic>
        <ViewScrollable>
            <svelte:fragment slot="header">
                <div class="flex flex-row gap-1 items-center w-full">
                    <div class="flex flex-row gap-1 items-center">
                        <BlankIcon />
                        <span>Deploy contracts</span>
                    </div>

                    <div class="flex flex-row gap-1 items-center ml-auto pr-1">
                        <HeaderButton callback={requestAddDeployedContract}>
                            <Tooltip align="left">
                                <svelte:fragment slot="content">
                                    <PlusIcon />
                                </svelte:fragment>
                                <svelte:fragment slot="tooltip">
                                    <span class="font-normal"
                                        >Add onchain contract to the deployment list</span
                                    >
                                </svelte:fragment>
                            </Tooltip>
                        </HeaderButton>
                    </div>
                </div>
            </svelte:fragment>
            <svelte:fragment slot="content">
                <Deploy />
            </svelte:fragment>
        </ViewScrollable>
    {/if}
</FlexContainer>
