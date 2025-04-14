<script lang="ts">
    import { notifications } from '../helpers/stores';
    import { fly } from 'svelte/transition';

    const TOAST_DURATION = 4000; // 4 seconds display time
    let timeoutId: ReturnType<typeof setTimeout>;
</script>

<div class="fixed top-4 right-4 z-[9999] flex flex-col gap-2">
    {#each $notifications as notification (notification.id)}
        <div
            class="flex items-start bg-white dark:bg-[#1a1a1a] rounded-lg p-3 min-w-[300px] max-w-[500px] shadow-lg"
            transition:fly|global={{ x: 100, duration: 300 }}
            on:mouseenter={() => clearTimeout(timeoutId)}
            on:mouseleave={() => {
                timeoutId = setTimeout(() => {
                    notifications.clearNotification(notification.id);
                }, TOAST_DURATION);
            }}
        >
            <div class="flex-1">
                <div class="font-medium mb-1 text-black dark:text-white">
                    {notification.notificationHeader}
                </div>
                <div class="text-gray-600 dark:text-gray-400 text-sm">
                    {notification.notificationBody}
                </div>
            </div>
            <button
                class="px-2 py-1 text-xl text-gray-600 dark:text-gray-400 hover:opacity-100 opacity-70 cursor-pointer bg-transparent border-0"
                on:click={() => notifications.clearNotification(notification.id)}
            >
                ×
            </button>
        </div>
    {/each}
</div>
