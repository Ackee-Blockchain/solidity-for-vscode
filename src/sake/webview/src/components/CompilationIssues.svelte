<script lang="ts">
    import { compilationState } from '../helpers/stores';
    import CompilationError from './CompilationError.svelte';
</script>

<div class="p-3">
    {#if $compilationState.issues.length > 0}
        <section class="w-full">
            <div class="flex flex-col gap-2">
                <span class="text-sm mb-2">
                    The compilation process handles files in batches. If any errors occur in a
                    single file, the entire batch won't be compiled, and the contracts from that
                    batch won't be displayed in <span class="italic">Compiled Contracts</span>.
                </span>
                {#each $compilationState.issues as issue (issue.fqn + issue.type)}
                    <CompilationError {issue} />
                {/each}
            </div>
        </section>
    {:else}
        <section class="h-full w-full flex flex-col items-center justify-center gap-3">
            <div class="flex flex-col gap-2 items-center text-vscodeInputForeground">
                <span class="text-sm my-2 text-center text-secon">No compilation issues</span>
            </div>
        </section>
        <!-- <p class="text-center">No contracts are compiled</p> -->
    {/if}
</div>
