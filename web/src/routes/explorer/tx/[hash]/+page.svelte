<script lang="ts">
	import {page} from '$app/stores';
	import TransactionView from '../../components/TransactionView.svelte';

	const txHash = $derived($page.params.hash as `0x${string}`);
</script>

<TransactionView {txHash} />
