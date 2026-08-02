<script lang="ts">
	import DefaultHead from '$lib/metadata/DefaultHead.svelte';
	import {getAppContext, route} from '$lib';
	import BleepTile from '$lib/bleeps/BleepTile.svelte';
	import MelodyList from '$lib/melodies/MelodyList.svelte';
	import {Button} from '$lib/shadcn/ui/button';
	import {Spinner} from '$lib/shadcn/ui/spinner';
	import {createMelodyIndex} from '$lib/melodies/index';
	import {createMelodyList} from '../melodies/lib/list';
	import {isOwned} from '$lib/bleeps/grid';
	import {HAS_MELODIES} from '$lib/navigation';

	const {viewState, account, connection} = getAppContext();

	const index = createMelodyIndex();

	// Rebuilt when the account changes, so switching wallet does not keep showing
	// the previous account's melodies.
	const melodies = $derived(
		createMelodyList({
			index,
			query: {first: 50, owner: $account},
		}),
	);

	const yourBleeps = $derived(
		$viewState.step === 'Loaded' && $account
			? $viewState.bleeps.owners
					.map((owner, id) => ({owner, id}))
					.filter(
						(entry) =>
							isOwned(entry.owner) &&
							entry.owner.toLowerCase() === $account.toLowerCase(),
					)
			: [],
	);

	const pending = $derived(
		$viewState.step === 'Loaded' ? $viewState.bleeps.pendingMelodies : [],
	);

	// A Bleep bought seconds ago is already in `owners` (the view merges this
	// user's in-flight purchases onto the chain read), so it shows up here at
	// once. Marked unsettled until the chain agrees.
	const pendingBleeps = $derived(
		new Set(
			$viewState.step === 'Loaded'
				? $viewState.bleeps.pendingBleeps.map((bleep) => bleep.id)
				: [],
		),
	);
</script>

<DefaultHead title="Yours" />

<div class="container mx-auto max-w-6xl px-4 py-8">
	<header class="mb-8 text-center">
		<h1 class="text-3xl font-bold">Yours</h1>
	</header>

	{#if !$account}
		<div class="flex flex-col items-center gap-4">
			<p class="text-sm text-muted-foreground">
				Connect a wallet to see your Bleeps{HAS_MELODIES
					? ' and melodies'
					: ''}.
			</p>
			<Button onclick={() => connection.connect()}>Connect</Button>
		</div>
	{:else}
		<section class="mb-12">
			<h2 class="mb-4 text-xl font-semibold">
				Bleeps
				<span class="text-sm font-normal text-muted-foreground">
					{yourBleeps.length}
				</span>
			</h2>

			{#if $viewState.step !== 'Loaded'}
				<p class="flex items-center gap-2 text-sm text-muted-foreground">
					<Spinner class="size-4" />
					Reading the chain...
				</p>
			{:else if yourBleeps.length === 0}
				<p class="text-sm text-muted-foreground">
					You do not own any Bleeps yet.
				</p>
			{:else}
				<div
					class="grid grid-cols-4 gap-2 sm:grid-cols-8 md:grid-cols-12 lg:grid-cols-16"
				>
					{#each yourBleeps as entry (entry.id)}
						<a
							href={route(`/bleeps/${entry.id}/`)}
							class="block transition-transform hover:scale-105"
						>
							<BleepTile
								id={entry.id}
								owner={entry.owner}
								yours
								pending={pendingBleeps.has(entry.id)}
							/>
						</a>
					{/each}
				</div>
			{/if}
		</section>

		<!-- Only where melodies exist. On mainnet `Yours` is your Bleeps, because
		     that is all there is to own there. See lib/navigation.ts. -->
		{#if HAS_MELODIES}
			<section>
				<h2 class="mb-4 text-xl font-semibold">Melodies</h2>
				<MelodyList
					result={$melodies}
					{pending}
					emptyMessage="You have not minted a melody yet."
				/>
			</section>
		{/if}
	{/if}
</div>
