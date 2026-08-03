<script lang="ts">
	import {page} from '$app/state';
	import DefaultHead from '$lib/metadata/DefaultHead.svelte';
	import {getAppContext, route} from '$lib';
	import BleepTile from '$lib/bleeps/BleepTile.svelte';
	import Address from '$lib/core/ui/ethereum/Address.svelte';
	import {Button} from '$lib/shadcn/ui/button';
	import {Spinner} from '$lib/shadcn/ui/spinner';
	import AlertCircleIcon from '@lucide/svelte/icons/alert-circle';
	import ArrowLeftIcon from '@lucide/svelte/icons/arrow-left';
	import {isValidBleepId, isOwned} from '$lib/bleeps/grid';
	import {instrumentNameFromId, noteName, hertz} from '$lib/melodies/notes';
	import {createBleepState} from './lib/bleep';

	const {publicClient, deployments, viewState, account} = getAppContext();
	const currentDeployments = deployments.get();

	const id = $derived(Number((page.params as {id?: string}).id));
	const valid = $derived(isValidBleepId(id));

	// One fetch per Bleep opened. Rebuilt when the id changes, which is what
	// navigating between two Bleeps does.
	const bleep = $derived(
		createBleepState({
			id: valid ? id : undefined,
			publicClient,
			deployments: currentDeployments,
		}),
	);

	const owner = $derived(
		$viewState.step === 'Loaded' ? $viewState.bleeps.owners[id] : undefined,
	);
	const yours = $derived(
		!!$account && owner?.toLowerCase() === $account.toLowerCase(),
	);
</script>

<DefaultHead
	title={valid
		? `${instrumentNameFromId(id)} ${noteName(id)}`
		: 'Unknown Bleep'}
/>

<div class="container mx-auto max-w-2xl px-4 py-8">
	<Button variant="ghost" href={route('/bleeps/')} class="mb-4">
		<ArrowLeftIcon class="size-4" />
		All Bleeps
	</Button>

	{#if !valid}
		<p class="flex items-center gap-2 text-destructive">
			<AlertCircleIcon class="size-4" />
			There are only 576 Bleeps, numbered 0 to 575.
		</p>
	{:else}
		<div class="flex flex-col items-center gap-6">
			<div class="w-64">
				<!-- No `yours` ring: this page has room to say who owns it in words,
				     so ownership is carried by the owner line below rather than by
				     decorating the tile. The ring is for the sale grid, where there is
				     no room to write anything. -->
				<BleepTile {id} {owner} resolveENS interactive={false} />
			</div>

			<div class="text-center">
				<h1 class="text-2xl font-bold">
					{instrumentNameFromId(id)}
					{noteName(id)}
				</h1>
				<p class="text-sm text-muted-foreground">
					Bleep #{id} at {hertz(id)}
				</p>
				{#if isOwned(owner) && owner}
					<p class="mt-2 flex items-center justify-center gap-1 text-sm">
						<span class="text-muted-foreground">Owned by</span>
						<!-- Green when it is the connected account's: the name (or address)
						     itself is what the reader is checking, so it is what changes. -->
						<Address
							value={owner}
							class={yours
								? 'font-medium text-green-600 dark:text-green-400'
								: ''}
						/>
						{#if yours}
							<span class="text-green-600 dark:text-green-400">(you)</span>
						{/if}
					</p>
				{:else if $viewState.step === 'Loaded'}
					<p class="mt-2 text-sm text-muted-foreground">Not minted.</p>
				{/if}
			</div>

			{#if $bleep.step === 'Loading'}
				<p class="flex items-center gap-2 text-sm text-muted-foreground">
					<Spinner class="size-4" />
					Rendering from the contract...
				</p>
			{:else if $bleep.step === 'Loaded'}
				<audio
					class="w-full max-w-md"
					src={$bleep.animationUrl}
					controls
					preload="auto"
				></audio>
				<a
					class="text-sm underline"
					download={`${$bleep.name}.wav`}
					href={$bleep.animationUrl}>Download the WAV</a
				>
			{:else}
				<p class="flex items-center gap-2 text-sm text-destructive">
					<AlertCircleIcon class="size-4" />
					{$bleep.message}
				</p>
			{/if}
		</div>
	{/if}
</div>
