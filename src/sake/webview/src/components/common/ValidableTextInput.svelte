<script lang="ts">
    export let label: string | undefined = undefined;
    export let placeholder: string | undefined = undefined;
    export let value: string | undefined = undefined;
    export let error: string | null = null;
    export let onChange: (value: string) => void | undefined = () => undefined;
    export let validate: (value: string) => string | null = () => null;
    export let transform: (value: string) => string = (value) => value;

    let stringValue: string | undefined = undefined;

    const valueChangeHandler = (e: CustomEvent<string>) => {
        stringValue = e.detail;
        const validationResult = validate(stringValue);
        if (validationResult !== null) {
            error = validationResult;
            return;
        }
        stringValue = transform(stringValue);
        value = stringValue;
        onChange(value);
    };
</script>

{#if label}
    <span class="text-sm">{label}</span>
{/if}
<vscode-text-field
    class="w-full"
    {placeholder}
    value={value ?? stringValue}
    on:change={valueChangeHandler}
/>
{#if error}
    <span class="text-xs text-red-500">{error}</span>
{/if}
