<script lang="ts">
	import type {HTMLImgAttributes} from 'svelte/elements';
	import {Blockie} from '$lib/core/utils/ethereum/blockie.js';

	interface BlockieProps extends HTMLImgAttributes {
		address: string;
		offset?: number;
	}

	let {address, offset = 0, ...restProps}: BlockieProps = $props();

	let uri = $derived(Blockie.getURI(address, offset));
</script>

<img {...restProps} src={uri} alt={address} />

<style>
	img {
		image-rendering: -moz-crisp-edges;
		image-rendering: -webkit-crisp-edges;
		image-rendering: crisp-edges;
		image-rendering: pixelated;
	}
</style>
