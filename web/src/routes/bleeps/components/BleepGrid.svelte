<script lang="ts">
	import {route} from '$lib';
	import BleepTile from '$lib/bleeps/BleepTile.svelte';
	import {instrumentRows, isOwned} from '$lib/bleeps/grid';
	import {colorFromId} from '$lib/melodies/notes';
	import type {PlayerState} from '$lib/bleeps/player';

	type Props = {
		/** The owners table, as the view merged it (chain read + pending mints). */
		owners: readonly string[] | undefined;
		/** The connected account, to pick out its own Bleeps. */
		yourAddress?: string;
		player: PlayerState;
		/** Bleeps somebody else is in the middle of buying. */
		booked?: Set<number>;
		/** Bleeps this user is buying, not yet confirmed. */
		pending?: Set<number>;
		onselect: (id: number) => void;
	};

	let {owners, yourAddress, player, booked, pending, onselect}: Props =
		$props();

	const rows = $derived(instrumentRows(owners));

	function playStateOf(id: number): 'idle' | 'loading' | 'playing' {
		if (player.step === 'Loading' && player.id === id) return 'loading';
		if (player.step === 'Playing' && player.id === id) return 'playing';
		return 'idle';
	}
</script>

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
				<div class="relative">
					<!-- Clicking plays the Bleep. It is a click and not a hover on
					     purpose: the contract needs a moment to render the WAV. -->
					<button
						type="button"
						class="block w-full transition-transform hover:scale-105"
						class:opacity-40={!isOwned(bleep.owner)}
						onclick={() => onselect(bleep.id)}
					>
						<BleepTile
							id={bleep.id}
							owner={bleep.owner}
							yours={!!yourAddress &&
								bleep.owner?.toLowerCase() === yourAddress}
							playState={playStateOf(bleep.id)}
							booked={booked?.has(bleep.id)}
							pending={pending?.has(bleep.id)}
						/>
					</button>
					<!-- The tile itself plays, so the page for one Bleep needs its own
					     way in. -->
					<a
						href={route(`/bleeps/${bleep.id}/`)}
						class="absolute top-0 right-0 p-0.5 text-muted-foreground opacity-60 hover:opacity-100"
						aria-label={`Bleep ${bleep.id} details`}
					>
						<!-- Drawn inline rather than imported: this renders 576 times, and
						     576 icon components is a real cost for one arrow. -->
						<svg
							class="size-3"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							stroke-width="2"
							stroke-linecap="round"
							stroke-linejoin="round"
							aria-hidden="true"
						>
							<path d="M7 17 17 7M7 7h10v10" />
						</svg>
					</a>
				</div>
			{/each}
		</div>
	</section>
{/each}
