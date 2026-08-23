<script lang="ts">
	import {writable} from 'svelte/store';
	import {toast} from 'svelte-sonner';
	import MelodyCanvas from './MelodyCanvas.svelte';
	import Address from '$lib/core/ui/ethereum/Address.svelte';
	import {Button} from '$lib/shadcn/ui/button';
	import {Spinner} from '$lib/shadcn/ui/spinner';
	import AlertCircleIcon from '@lucide/svelte/icons/alert-circle';
	import PlayIcon from '@lucide/svelte/icons/play';
	import PauseIcon from '@lucide/svelte/icons/pause';
	import LoaderCircleIcon from '@lucide/svelte/icons/loader-circle';
	import FlameIcon from '@lucide/svelte/icons/flame';
	import type {MelodyIndexResult} from './index';
	import {mergePendingMelodies, type PendingMelody} from '$lib/view/index';
	import {getAppContext, params} from '$lib';
	import {melodyPlayer, toggleMelodyPlay} from './play';
	import {allowBurnParam, burnMelody, filterBurned} from './burn';

	type Props = {
		result: MelodyIndexResult;
		/** Shown first, greyed: this user's mints the index has not caught up with. */
		pending?: PendingMelody[];
		emptyMessage?: string;
	};

	let {
		result,
		pending = [],
		emptyMessage = 'No melodies yet.',
	}: Props = $props();

	const {
		publicClient,
		deployments,
		account,
		connection,
		accountExecutor,
		accountBalance,
		balanceCheck,
		accountCannotSend,
		errorDetails,
	} = getAppContext();
	const currentDeployments = deployments.get();

	// `?allow-burn` is a global query param DECLARED IN lib/index.ts, so it is
	// already parsed there and survives navigation once set. Read from that
	// handler rather than from `page.url`, which would be a second reader of the
	// same value and the only reason this component named the framework at all
	// (see test/framework-boundary.test.ts). `dev` and `burnerOverride` are
	// resolved from the same snapshot, for the same reason.
	//
	// Off by default: burning is a maintainer/demo affordance, not something
	// every visitor should see.
	const allowBurn = allowBurnParam(params['allow-burn']);

	// The index is authoritative for what exists, so a melody it already lists is
	// not also shown as pending, however far behind the operation's own state is.
	const stillPending = $derived(
		result.step === 'Loaded'
			? mergePendingMelodies(result.melodies, pending)
			: pending,
	);

	// Burned melodies (owner is the dead address) are filtered out of the view.
	// Computed from the loaded result so the empty-state check agrees with what
	// is actually rendered.
	const visibleMelodies = $derived(
		result.step === 'Loaded' ? filterBurned(result.melodies) : [],
	);

	// Whether the connected account owns a given melody. Only an owner can burn,
	// so the burn button is gated on this rather than shown to everyone.
	function isOwnedByYou(owner: `0x${string}` | undefined): boolean {
		return (
			!!$account && !!owner && owner.toLowerCase() === $account.toLowerCase()
		);
	}

	// Track which melody is currently being burned, so a card shows a spinner on
	// its own button and nothing else does.
	let burningId = $state<string | undefined>(undefined);

	async function onBurn(indexedId: string, name: string) {
		if (burningId !== undefined) return;
		const confirmed = window.confirm(
			`Burn "${name}"? This sends the melody to a dead address. It cannot be undone.`,
		);
		if (!confirmed) return;
		burningId = indexedId;
		try {
			const outcome = await burnMelody(
				{
					connection,
					accountExecutor,
					accountBalance,
					deployments,
					balanceCheck,
				},
				indexedId,
			);
			if (outcome.status === 'submitted') {
				toast.success('Melody burn submitted', {
					description:
						'It will leave your account once the transaction is mined.',
				});
			} else if (outcome.status === 'cannot-send') {
				accountCannotSend.show();
			} else if (outcome.status === 'error') {
				toast.error('Could not burn', {
					description: outcome.message,
					duration: 8000,
					closeButton: true,
					action: {
						label: 'Details',
						onClick: () => errorDetails.show(outcome.details),
					},
				});
			}
		} finally {
			burningId = undefined;
		}
	}
</script>

{#if stillPending.length > 0}
	<ul class="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
		{#each stillPending as melody (melody.operationID)}
			<li class="rounded-lg border border-dashed border-muted p-3 opacity-60">
				<p class="flex items-center gap-2 text-sm">
					<Spinner class="size-4" />
					Minting {melody.name}...
				</p>
			</li>
		{/each}
	</ul>
{/if}

{#if result.step === 'Loading'}
	<p class="flex items-center gap-2 text-sm text-muted-foreground">
		<Spinner class="size-4" />
		Reading the index...
	</p>
{:else if result.step === 'Unavailable'}
	<p class="text-sm text-muted-foreground">{result.message}</p>
{:else if result.step === 'Failed'}
	<p class="flex items-center gap-2 text-sm text-destructive">
		<AlertCircleIcon class="size-4" />
		{result.message}
	</p>
{:else if visibleMelodies.length === 0 && stillPending.length === 0}
	<p class="text-sm text-muted-foreground">{emptyMessage}</p>
{:else}
	<ul class="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
		{#each visibleMelodies as indexed (indexed.id)}
			<li class="flex flex-col items-center gap-2">
				{#if indexed.melody}
					<div class="relative w-full text-center">
						<MelodyCanvas melody={writable(indexed.melody)} editable={false} />
						<button
							type="button"
							class="group absolute inset-0 flex items-center justify-center"
							aria-label={$melodyPlayer.id === indexed.id &&
							$melodyPlayer.phase === 'playing'
								? `Pause ${indexed.melody.name}`
								: `Play ${indexed.melody.name}`}
							onclick={() =>
								toggleMelodyPlay({
									id: indexed.id,
									melody: indexed.melody!,
									publicClient,
									deployments: currentDeployments,
								})}
						>
							<span
								class="flex size-12 items-center justify-center rounded-full bg-black/55 text-white backdrop-blur-sm transition-transform group-hover:scale-110"
							>
								{#if $melodyPlayer.id === indexed.id && $melodyPlayer.phase === 'loading'}
									<LoaderCircleIcon class="size-6 animate-spin" />
								{:else if $melodyPlayer.id === indexed.id && $melodyPlayer.phase === 'playing'}
									<PauseIcon class="size-6" />
								{:else if $melodyPlayer.id === indexed.id && $melodyPlayer.phase === 'error'}
									<AlertCircleIcon class="size-6" />
								{:else}
									<PlayIcon class="size-6" />
								{/if}
							</span>
						</button>
					</div>
					{#if $melodyPlayer.id === indexed.id && $melodyPlayer.phase === 'error'}
						<p class="flex items-center gap-1 text-xs text-destructive">
							<AlertCircleIcon class="size-3" />
							{$melodyPlayer.error ?? 'could not play'}
						</p>
					{/if}
				{:else}
					<div
						class="flex aspect-square w-full items-center justify-center rounded-lg border border-dashed border-muted text-sm text-muted-foreground"
					>
						Reserved, not revealed
					</div>
				{/if}
				<div class="flex w-full items-center justify-center gap-2">
					<p class="flex items-center gap-1 text-xs">
						<span class="text-muted-foreground">by</span>
						<Address value={indexed.creator} />
					</p>
					{#if isOwnedByYou(indexed.owner) && allowBurn}
						<Button
							size="sm"
							variant="destructive"
							class="h-6 px-2 text-xs"
							disabled={burningId === indexed.id}
							onclick={() =>
								onBurn(indexed.id, indexed.melody?.name ?? `#${indexed.id}`)}
						>
							{#if burningId === indexed.id}
								<LoaderCircleIcon class="size-3 animate-spin" />
							{:else}
								<FlameIcon class="size-3" />
							{/if}
							Burn
						</Button>
					{/if}
				</div>
			</li>
		{/each}
	</ul>
{/if}
