<script lang="ts">
	import {page} from '$app/stores';
	import AddressView from '../../components/AddressView.svelte';

	const address = $derived($page.params.address as `0x${string}`);
</script>

<AddressView {address} />
