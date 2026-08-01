<script lang="ts">
	import TransactionView from '../components/TransactionView.svelte';
	import {createHexLocationParamStore} from '../lib/location-param';

	// Read the tx hash from the URL hash or pathname (both IPFS gateway styles).
	const txHash = createHexLocationParamStore('tx');
</script>

<TransactionView txHash={$txHash} />
