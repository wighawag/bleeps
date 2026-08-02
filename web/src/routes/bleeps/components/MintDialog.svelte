<script lang="ts">
	import * as Modal from '$lib/core/ui/modal/index.js';
	import {Button} from '$lib/shadcn/ui/button';
	import {Spinner} from '$lib/shadcn/ui/spinner';
	import Address from '$lib/core/ui/ethereum/Address.svelte';
	import BleepTile from '$lib/bleeps/BleepTile.svelte';
	import AlertCircleIcon from '@lucide/svelte/icons/alert-circle';
	import {route} from '$lib';
	import {formatBalance} from '$lib/core/utils/format/balance';
	import {instrumentNameFromId, noteName} from '$lib/melodies/notes';
	import {isOwned} from '$lib/bleeps/grid';
	import {isCreatorReserved} from '$lib/sale/mode';
	import type {PlayerState} from '$lib/bleeps/player';
	import type {BleepSound} from '$lib/bleeps/sound';
	import type {SalePass} from '$lib/sale/passes';
	import type {SalePhase} from '$lib/sale/sale-state';

	type Props = {
		/** The Bleep under consideration, or undefined when the dialog is closed. */
		id: number | undefined;
		owner?: string;
		player: PlayerState;
		/** What was rendered for it, once heard: outlives the sound itself. */
		sound?: BleepSound;
		phase?: SalePhase;
		pass: SalePass;
		price?: bigint;
		/** Creator's cut, in hundredths of a percent. */
		percentageForCreator: number;
		booked: boolean;
		pending: boolean;
		minting: boolean;
		onclose: () => void;
		onmint: (id: number) => void;
		onreplay: (id: number) => void;
	};

	let {
		id,
		owner,
		player,
		sound,
		phase,
		pass,
		price,
		percentageForCreator,
		booked,
		pending,
		minting,
		onclose,
		onmint,
		onreplay,
	}: Props = $props();

	const playState = $derived(
		player.step === 'Loading' && player.id === id
			? 'loading'
			: player.step === 'Playing' && player.id === id
				? 'playing'
				: 'idle',
	);

	const daoShare = $derived(
		price === undefined
			? undefined
			: (price * BigInt(10000 - percentageForCreator)) / 10000n,
	);
	const creatorShare = $derived(
		price === undefined
			? undefined
			: (price * BigInt(percentageForCreator)) / 10000n,
	);

	/**
	 * Why this Bleep cannot be bought right now, or undefined when it can.
	 *
	 * Kept as one reason rather than a boolean so the button can say which it is:
	 * "already minted" and "wait for the public sale" are different problems and
	 * only one of them is the user's to solve.
	 */
	const blocked = $derived.by((): string | undefined => {
		if (id === undefined) return 'nothing selected';
		if (isCreatorReserved(id)) return 'reserved for the creator';
		if (isOwned(owner)) return 'already minted';
		if (pending) return 'your purchase is pending';
		if (booked) return 'somebody else is buying it';
		if (phase === 'not-started') return 'the sale has not started';
		if (
			phase === 'whitelist' &&
			pass.kind !== 'address-bound' &&
			pass.kind !== 'transferable'
		)
			return 'needs a pass';
		if (price === undefined) return 'reading the sale';
		return undefined;
	});
</script>

<Modal.Root openWhen={id !== undefined} onCancel={onclose}>
	{#if id !== undefined}
		<Modal.Title>
			{instrumentNameFromId(id)}
			{noteName(id)}
		</Modal.Title>

		<div class="flex flex-col items-center gap-4 py-2">
			<div class="w-48">
				<BleepTile {id} {owner} {playState} interactive={false} />
			</div>

			{#if player.step === 'Loading' && player.id === id}
				<p class="flex items-center gap-2 text-sm text-muted-foreground">
					<Spinner class="size-4" />
					Rendering from the contract...
				</p>
			{:else if player.step === 'Failed' && player.id === id}
				<p class="flex items-center gap-2 text-sm text-destructive">
					<AlertCircleIcon class="size-4" />
					{player.message}
				</p>
			{/if}

			{#if sound}
				<audio
					class="w-full max-w-sm"
					src={sound.animationUrl}
					controls
					preload="auto"
				></audio>
				<Button variant="ghost" size="sm" onclick={() => onreplay(id)}>
					Play again
				</Button>
			{/if}

			{#if isOwned(owner) && owner}
				<p class="flex items-center gap-1 text-sm">
					<span class="text-muted-foreground">Owned by</span>
					<Address value={owner as `0x${string}`} />
				</p>
			{:else if price !== undefined}
				<div class="text-center text-sm">
					<p>
						<span class="text-bleeps">Bleeps DAO</span> will receive
						{formatBalance(daoShare ?? 0n)} ETH
					</p>
					<p>
						<a
							href="https://twitter.com/wighawag"
							target="_blank"
							class="text-bleeps underline">wighawag</a
						>
						will receive {formatBalance(creatorShare ?? 0n)} ETH
					</p>
				</div>
			{/if}

			<Button
				class="w-64"
				disabled={!!blocked || minting}
				onclick={() => onmint(id)}
			>
				{#if minting}
					<Spinner class="size-4" />
					Minting...
				{:else if blocked}
					{blocked}
				{:else}
					mint for {formatBalance(price ?? 0n)} ETH
				{/if}
			</Button>

			<a class="text-sm underline" href={route(`/bleeps/${id}/`)}>
				Open this Bleep's page
			</a>
		</div>
	{/if}
</Modal.Root>
