<script lang="ts">
	import {get, writable} from 'svelte/store';
	import {toast} from 'svelte-sonner';
	import DefaultHead from '$lib/metadata/DefaultHead.svelte';
	import {getAppContext, hashParams} from '$lib';
	import {NUM_BLEEPS} from '$lib/onchain/state';
	import {formatBalance} from '$lib/core/utils/format/balance';
	import {Spinner} from '$lib/shadcn/ui/spinner';
	import {createBleepPlayer} from '$lib/bleeps/player';
	import {fetchBleepSound, type BleepSound} from '$lib/bleeps/sound';
	import {saleDeployment} from '$lib/sale/deployment';
	import {resolveSalePass} from '$lib/sale/passes';
	import {createSaleInfo, priceFor, salePhase} from '$lib/sale/sale-state';
	import {bookedBleeps, createBookingClient} from '$lib/sale/booking';
	import {mintBleep} from '$lib/sale/mintBleep';
	import {idsForSale} from '$lib/sale/mode';
	import {PUBLIC_BOOKING_SERVICE_URL} from '$env/static/public';
	import BleepGrid from './components/BleepGrid.svelte';
	import SaleHeader from './components/SaleHeader.svelte';
	import MintDialog from './components/MintDialog.svelte';

	const {
		viewState,
		account,
		publicClient,
		deployments,
		connection,
		accountExecutor,
		accountBalance,
		balanceCheck,
		accountCannotSend,
		clock,
	} = getAppContext();
	const currentDeployments = deployments.get();

	// Present only where a sale was deployed. Whether it is RUNNING is a
	// different question, answered by the chain: see lib/sale/mode.ts.
	const sale = saleDeployment(currentDeployments);

	const owners = $derived(
		$viewState.step === 'Loaded' ? $viewState.bleeps.owners : undefined,
	);
	const mintMode = $derived(
		$viewState.step === 'Loaded' && $viewState.bleeps.mode === 'mint' && !!sale,
	);
	const yourAddress = $derived($account?.toLowerCase());

	// ----------------------------------------------------------------------------
	// PLAYING
	// ----------------------------------------------------------------------------

	// One sound at a time, cached after the first render. `tokenURI` is about
	// 7.5M gas, so the first click on a Bleep waits and every later one does not.
	const player = createBleepPlayer({
		fetch: (id) =>
			fetchBleepSound({publicClient, deployments: currentDeployments, id}),
	});

	// A Bleep is about a second long, so the player is back to idle almost at
	// once. What it rendered is kept, so the dialog can go on offering the sound
	// (with controls, and a download) rather than emptying itself when the sound
	// stops.
	let heard = $state<Record<number, BleepSound>>({});
	$effect(() => {
		const state = $player;
		if (state.step === 'Playing' && !heard[state.id]) {
			heard = {...heard, [state.id]: state.sound};
		}
	});

	// ----------------------------------------------------------------------------
	// THE SALE
	// ----------------------------------------------------------------------------

	const passKey = hashParams['passKey'];
	const pass = $derived(
		sale
			? resolveSalePass({
					leaves: sale.linkedData.leaves,
					account: $account,
					passKey,
				})
			: ({kind: 'none'} as const),
	);

	/**
	 * What the sale poller should ask about, and whether it should ask at all.
	 *
	 * Undefined means "do not fetch": the polling store treats a falsy source
	 * that way, which is how a sold-out deployment (mainnet, or a dev chain after
	 * the last Bleep goes) stops reading a contract that has nothing left to say.
	 */
	const saleSource = writable<{passId: number | undefined} | undefined>(
		undefined,
	);
	$effect(() => {
		const next =
			mintMode && sale
				? {
						passId:
							pass.kind === 'address-bound' || pass.kind === 'transferable'
								? pass.passId
								: undefined,
					}
				: undefined;
		const current = get(saleSource);
		const changed =
			(current === undefined) !== (next === undefined) ||
			current?.passId !== next?.passId;
		if (changed) {
			saleSource.set(next);
		}
	});

	const saleInfo = sale
		? createSaleInfo({publicClient, sale, passId: saleSource})
		: undefined;

	const info = $derived(
		saleInfo && $saleInfo?.step === 'Loaded' ? $saleInfo : undefined,
	);
	const phase = $derived(
		info ? salePhase(info, Math.floor($clock / 1000)) : undefined,
	);
	const price = $derived(info && phase ? priceFor(info, phase) : undefined);

	// The booking service is advisory and dev-only; an empty URL simply means
	// nobody is booking anything. See lib/sale/booking.ts.
	const bookingEnabled = writable(false);
	$effect(() => {
		bookingEnabled.set(mintMode);
	});
	const booking = createBookingClient(
		PUBLIC_BOOKING_SERVICE_URL,
		bookingEnabled,
	);
	const bookings = booking?.bookings;
	const booked = $derived(
		bookings && $bookings?.step === 'Loaded'
			? bookedBleeps($bookings.bookings, Math.floor($clock / 1000))
			: new Set<number>(),
	);
	// A booking of your own is not a reason to stop you: it is you.
	const bookedByOthers = $derived.by(() => {
		if (!yourAddress || !bookings || $bookings?.step !== 'Loaded')
			return booked;
		const others = new Set(booked);
		for (const entry of $bookings.bookings) {
			if (entry.address.toLowerCase() === yourAddress) {
				others.delete(entry.bleep);
			}
		}
		return others;
	});

	const pendingIds = $derived(
		new Set(
			$viewState.step === 'Loaded'
				? $viewState.bleeps.pendingBleeps.map((bleep) => bleep.id)
				: [],
		),
	);

	const forSaleCount = 448;
	const soldCount = $derived(
		owners ? forSaleCount - idsForSale(owners).length : 0,
	);

	// ----------------------------------------------------------------------------
	// SELECTION
	// ----------------------------------------------------------------------------

	let selected = $state<number | undefined>(undefined);
	let minting = $state(false);

	function select(id: number) {
		void player.play(id);
		// Browse mode is for listening; the dialog is where a purchase is decided,
		// as it was on the pre-template site.
		if (mintMode) {
			selected = id;
		}
	}

	async function mint(id: number) {
		if (!sale || price === undefined || !phase) {
			return;
		}
		minting = true;
		try {
			const result = await mintBleep(
				{connection, accountExecutor, accountBalance, balanceCheck},
				{
					id,
					sale,
					pass,
					publicPhase: phase === 'public',
					price,
					booking,
				},
			);
			if (result.status === 'submitted') {
				selected = undefined;
				toast.success('Purchase submitted', {
					description: `Bleep #${id} is yours once the transaction is mined.`,
				});
			} else if (result.status === 'cannot-send') {
				accountCannotSend.show();
			} else if (result.status === 'error') {
				toast.error(result.message, {
					description: result.details,
					duration: 8000,
					closeButton: true,
				});
			}
		} finally {
			minting = false;
		}
	}
</script>

<DefaultHead title="Bleeps" />

<div class="container mx-auto max-w-7xl px-4 py-8">
	<header class="mb-8 text-center">
		<h1 class="text-3xl font-bold">Bleeps</h1>
		{#if $viewState.step === 'Loaded'}
			<p class="mt-2 text-sm text-muted-foreground">
				{$viewState.bleeps.minted} of {NUM_BLEEPS} minted. The DAO holds
				{formatBalance($viewState.bleeps.treasury)} ETH.
			</p>
			<p class="mt-1 text-xs text-muted-foreground">
				Click a Bleep to hear it.
			</p>
		{:else}
			<p
				class="mt-2 flex items-center justify-center gap-2 text-sm text-muted-foreground"
			>
				<Spinner class="size-4" />
				Reading the chain...
			</p>
		{/if}
	</header>

	{#if mintMode && sale && $viewState.step === 'Loaded'}
		<SaleHeader
			startTime={sale.linkedData.startTime}
			publicSaleTimestamp={sale.linkedData.publicSaleTimestamp}
			now={$clock}
			{info}
			{phase}
			{pass}
			sold={soldCount}
			forSale={forSaleCount}
			treasury={$viewState.bleeps.treasury}
		/>
	{/if}

	<BleepGrid
		{owners}
		{yourAddress}
		player={$player}
		booked={bookedByOthers}
		pending={pendingIds}
		onselect={select}
	/>
</div>

<MintDialog
	id={selected}
	owner={selected !== undefined ? owners?.[selected] : undefined}
	player={$player}
	sound={selected !== undefined ? heard[selected] : undefined}
	{phase}
	{pass}
	{price}
	percentageForCreator={sale?.linkedData.percentageForCreator ?? 2500}
	booked={selected !== undefined && bookedByOthers.has(selected)}
	pending={selected !== undefined && pendingIds.has(selected)}
	{minting}
	onclose={() => (selected = undefined)}
	onmint={mint}
	onreplay={(id) => player.play(id)}
/>
