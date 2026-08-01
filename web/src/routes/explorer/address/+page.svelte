<script lang="ts">
	import AddressView from '../components/AddressView.svelte';
	import {createHexLocationParamStore} from '../lib/location-param';

	// Read address from the URL hash or pathname (both IPFS gateway styles).
	const address = createHexLocationParamStore('address');
</script>

<AddressView address={$address} />
