<script lang="ts">
	import MandalaIcon from '$lib/icons/MandalaIcon.svelte';
	import DiscordIcon from '$lib/icons/DiscordIcon.svelte';
	import {saleCountdown} from './countdown';

	type Props = {
		/** Unix seconds, from the sale's deployment record. */
		startTime: number;
		/** Unix seconds. */
		publicSaleTimestamp: number;
		/** Milliseconds, from the app clock, so this ticks. */
		now: number;
	};

	let {startTime, publicSaleTimestamp, now}: Props = $props();

	const state = $derived(
		saleCountdown({
			startTime,
			publicSaleTimestamp,
			nowSeconds: Math.floor(now / 1000),
		}),
	);
</script>

{#if state.phase === 'not-started'}
	<div class="mx-auto h-24 w-80 border-4 border-white pt-1 sm:w-96">
		<span class="text-bleeps">
			Private Sale for <MandalaIcon class="inline h-4 w-4 text-bleeps" /> and
			<DiscordIcon class="inline h-4 w-4 text-bleeps" />
		</span>
		<div class="mx-auto mt-1">Opens in:</div>
		<span>{state.opensIn}</span>
	</div>
{:else if state.phase === 'whitelist'}
	<div class="mx-auto h-24 w-80 border-4 border-white pt-1 sm:w-96">
		<span>Ongoing </span>
		<span class="text-bleeps">
			Private Sale for <MandalaIcon class="inline h-4 w-4 text-bleeps" /> and
			<DiscordIcon class="inline h-4 w-4 text-bleeps" />
		</span>
		<div class="mx-auto mt-1">Time Left:</div>
		<span>{state.timeLeft}</span>
	</div>
{:else}
	<div class="mx-auto h-12 w-80 border-4 border-white pt-2 sm:w-96">
		<span>Ongoing </span> <span class="text-bleeps">Public Sale</span>
	</div>
{/if}
