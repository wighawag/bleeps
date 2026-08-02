<script lang="ts">
	import SaleCountdown from '$lib/sale/SaleCountdown.svelte';
	import MandalaIcon from '$lib/icons/MandalaIcon.svelte';
	import PassKeyIcon from '$lib/icons/PassKeyIcon.svelte';
	import {formatBalance} from '$lib/core/utils/format/balance';
	import {Spinner} from '$lib/shadcn/ui/spinner';
	import type {SalePass} from '$lib/sale/passes';
	import type {SaleInfo, SalePhase} from '$lib/sale/sale-state';

	type Props = {
		startTime: number;
		publicSaleTimestamp: number;
		/** Milliseconds; the app clock, so the countdown ticks. */
		now: number;
		info?: SaleInfo;
		phase?: SalePhase;
		pass: SalePass;
		/** Of the 448 that can be bought, how many are gone. */
		sold: number;
		forSale: number;
		treasury: bigint;
	};

	let {
		startTime,
		publicSaleTimestamp,
		now,
		info,
		phase,
		pass,
		sold,
		forSale,
		treasury,
	}: Props = $props();

	const price = $derived(
		info ? (phase === 'public' ? info.price : info.whitelistPrice) : undefined,
	);
	const soldPercent = $derived(
		forSale > 0 ? Math.max((sold * 100) / forSale, 5) : 100,
	);
</script>

<div class="mb-8 text-center font-black">
	<SaleCountdown {startTime} {publicSaleTimestamp} {now} />

	<p class="mt-8 text-bleeps">
		Bleeps DAO Treasury: {formatBalance(treasury)} ETH
	</p>

	<div class="mt-2">
		<div
			class="mx-auto inline-block h-16 w-32 rounded-md border-2 border-bleeps md:h-24 md:w-64"
		>
			<div
				style={`width:${soldPercent}%; background-color:#dab894;height:100%;`}
			></div>
		</div>
		<div
			class="mx-auto inline-block h-16 w-12 rounded-md border-2 border-bleeps md:h-24 md:w-24"
		>
			<p class="invisible absolute mx-3 my-8 md:visible">reserved</p>
		</div>
	</div>

	<div>
		<div class="mx-auto inline-block w-32 md:w-64">
			<p class="text-yellow-400">{sold} / {forSale} Minted</p>
		</div>
		<div class="mx-auto inline-block w-12 md:w-24">
			<p>+128</p>
		</div>
	</div>

	<div class="mb-4">
		<p class="text-bleeps">
			{#if price !== undefined}
				Price: {formatBalance(price)} ETH
			{:else}
				<span class="inline-flex items-center gap-2 text-muted-foreground">
					<Spinner class="size-4" />
					Reading the sale...
				</span>
			{/if}
		</p>
	</div>

	<!-- What this visitor can present. A pass is the difference between being
	     able to buy now and having to wait for the public phase. -->
	{#if pass.kind === 'invalid'}
		<div
			class="mx-auto inline-block rounded-md border border-red-400 p-2 text-center"
		>
			<p>Invalid pass key</p>
			<p class="text-xs text-muted-foreground">{pass.message}</p>
		</div>
	{:else if pass.kind !== 'none' && info?.passUsed}
		<div
			class="mx-auto inline-block rounded-md border border-red-400 p-2 text-center"
		>
			<p>Pass used</p>
		</div>
	{:else if pass.kind === 'transferable'}
		<div class="mx-auto inline-flex items-center gap-2">
			<PassKeyIcon class="h-6 w-6 text-bleeps" />
			<div class="rounded-md border border-bleeps p-2 text-center">
				<p>1 available mint</p>
				<p class="text-xs text-bleeps">pass key</p>
			</div>
		</div>
	{:else if pass.kind === 'address-bound'}
		<div class="mx-auto inline-flex items-center gap-2">
			<MandalaIcon class="h-6 w-6 text-bleeps" />
			<div class="rounded-md border border-bleeps p-2 text-center">
				<p>1 available mint</p>
				<p class="text-xs text-bleeps">this address</p>
			</div>
		</div>
	{:else if phase === 'whitelist'}
		<p class="text-sm font-normal text-muted-foreground">
			The private sale needs a pass. Anyone can buy once the public sale opens.
		</p>
	{/if}
</div>
