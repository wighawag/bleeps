<script lang="ts">
	import {writable} from 'svelte/store';
	import MelodyCanvas from './MelodyCanvas.svelte';
	import Address from '$lib/core/ui/ethereum/Address.svelte';
	import {Spinner} from '$lib/shadcn/ui/spinner';
	import AlertCircleIcon from '@lucide/svelte/icons/alert-circle';
	import type {MelodyIndexResult} from './index';
	import {mergePendingMelodies, type PendingMelody} from '$lib/view/index';

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

	// The index is authoritative for what exists, so a melody it already lists is
	// not also shown as pending, however far behind the operation's own state is.
	const stillPending = $derived(
		result.step === 'Loaded'
			? mergePendingMelodies(result.melodies, pending)
			: pending,
	);
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
{:else if result.melodies.length === 0 && stillPending.length === 0}
	<p class="text-sm text-muted-foreground">{emptyMessage}</p>
{:else}
	<ul class="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
		{#each result.melodies as indexed (indexed.id)}
			<li class="flex flex-col items-center gap-2">
				{#if indexed.melody}
					<MelodyCanvas melody={writable(indexed.melody)} editable={false} />
				{:else}
					<div
						class="flex aspect-square w-full items-center justify-center rounded-lg border border-dashed border-muted text-sm text-muted-foreground"
					>
						Reserved, not revealed
					</div>
				{/if}
				<p class="flex items-center gap-1 text-xs">
					<span class="text-muted-foreground">by</span>
					<Address value={indexed.creator} />
				</p>
			</li>
		{/each}
	</ul>
{/if}
