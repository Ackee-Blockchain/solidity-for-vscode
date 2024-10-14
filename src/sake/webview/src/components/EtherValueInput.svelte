<script lang="ts">
    let value: number | undefined;

    function handleValueChange(event: any) {
        const _value = parseInt(event.target.value);
        if (isNaN(_value)) {
            value = undefined;
            return;
        }
        value = _value;
    }
</script>

<div class="d-flex flex-row">
    <vscode-text-field placeholder="Value" class="w-full" {value} on:change={handleValueChange} />
    <vscode-dropdown position="below" class="w-full mb-2">
        <vscode-option value="wei">wei</vscode-option>
        <vscode-option value="gwei">gwei</vscode-option>
        <vscode-option value="ether">ether</vscode-option>
    </vscode-dropdown>
</div>
