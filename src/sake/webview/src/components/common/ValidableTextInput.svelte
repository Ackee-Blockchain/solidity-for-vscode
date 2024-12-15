<script lang="ts">
    import InfoTooltip from '../InfoTooltip.svelte';
    export let label: string | undefined = undefined;
    export let placeholder: string | undefined = undefined;
    export let value: string | undefined = undefined;
    export let error: string | null = null;
    export let tooltip: string | null = null;
    export let onChange: (value: string) => void | undefined = () => undefined;
    export let validate: (value: string | undefined) => string | null = () => null;
    export let transform: (value: string | undefined) => string = (value) => value ?? '';

    let stringValue: string | undefined = undefined;
    export let autofocus: boolean = false;

    const valueChangeHandler = (event: any) => {
        stringValue = event.target.value;
        const validationResult = validate(stringValue);
        if (validationResult != null) {
            error = validationResult;
            value = undefined;
            return;
        }
        error = null;
        stringValue = transform(stringValue);
        value = stringValue;
        onChange(value);
    };
</script>

<div>
    {#if label}
        <div class="flex gap-1">
            <span class="text-sm">{label}</span>
            {#if tooltip}
                <InfoTooltip content={tooltip} />
            {/if}
        </div>
    {/if}
    <!-- svelte-ignore a11y-autofocus -->
    <vscode-text-field
        class="w-full"
        {placeholder}
        value={value ?? stringValue ?? ''}
        {autofocus}
        on:change={valueChangeHandler}
    />
    {#if error}
        <span class="text-xs text-red-500">{error}</span>
    {/if}
</div>
