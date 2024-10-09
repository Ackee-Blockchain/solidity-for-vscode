<script lang="ts">
    import { deployedContracts } from '../stores/sakeStore';
</script>

<span>Interaction</span>
<vscode-badge appearance="secondary">
    <!-- style="padding:5px 3px;" -->
    {$deployedContracts.length}
</vscode-badge>
