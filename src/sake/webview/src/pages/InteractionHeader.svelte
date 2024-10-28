<script lang="ts">
    import { deployedContracts } from '../helpers/stores';
</script>

<span>Interact</span>
<span class="font-normal">
    <vscode-badge appearance="secondary">
        <!-- style="padding:5px 3px;" -->
        {$deployedContracts.length}
    </vscode-badge>
</span>
