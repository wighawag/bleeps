<script lang="ts">
	import DefaultHead from '$lib/metadata/DefaultHead.svelte';
	import {getAppContext, route} from '$lib';
	import BleepTile from '$lib/bleeps/BleepTile.svelte';
	import {instrumentRows, isOwned} from '$lib/bleeps/grid';
	import {colorFromId} from '$lib/melodies/notes';
	import {NUM_BLEEPS} from '$lib/onchain/state';
	import {formatBalance} from '$lib/core/utils/format/balance';
	import {Spinner} from '$lib/shadcn/ui/spinner';

	const {viewState, account} = getAppContext();

	const owners = $derived(
		$viewState.step === 'Loaded' ? $viewState.bleeps.owners : undefined,
	);
	const rows = $derived(instrumentRows(owners));
	const yourAddress = $derived($account?.toLowerCase());
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
		{:else}
			<p
				class="mt-2 flex items-center justify-center gap-2 text-sm text-muted-foreground"
			>
				<Spinner class="size-4" />
				Reading the chain...
			</p>
		{/if}
	</header>

	{#each rows as row (row.instrument)}
		<section class="mb-10">
			<h2
				class="mb-3 text-lg font-semibold"
				style={`color:#${colorFromId(row.instrument << 6)}`}
			>
				{row.name}
				<span class="text-sm font-normal text-muted-foreground">
					{row.minted}/{row.bleeps.length}
				</span>
			</h2>

			<div
				class="grid grid-cols-4 gap-2 sm:grid-cols-8 md:grid-cols-12 lg:grid-cols-16"
			>
				{#each row.bleeps as bleep (bleep.id)}
					<a
						href={route(`/bleeps/${bleep.id}/`)}
						class="block transition-transform hover:scale-105"
						class:opacity-40={!isOwned(bleep.owner)}
					>
						<BleepTile
							id={bleep.id}
							owner={bleep.owner}
							yours={!!yourAddress &&
								bleep.owner?.toLowerCase() === yourAddress}
						/>
					</a>
				{/each}
			</div>
		</section>
	{/each}
</div>
