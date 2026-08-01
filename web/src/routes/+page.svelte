<script lang="ts">
	import {route, getAppContext} from '$lib';
	import {url} from '$lib/core/utils/web/path';
	import Button from '$lib/shadcn/ui/button/button.svelte';
	import DefaultHead from '../lib/metadata/DefaultHead.svelte';
	import {name} from '../web-config.json';
	import {NUM_BLEEPS} from '$lib/onchain/state';
	import {formatBalance} from '$lib/core/utils/format/balance';

	const {viewState} = getAppContext();
</script>

<DefaultHead />

<div class="container mx-auto max-w-6xl px-4 py-12">
	<div class="mb-16 flex flex-col items-center text-center">
		<img
			src={url('/icon.svg')}
			alt={name}
			class="mb-8 h-48 w-48 drop-shadow-lg"
		/>
		<h1 class="mb-4 text-5xl font-bold tracking-tight text-primary md:text-6xl">
			{name}
		</h1>
		<p class="mb-6 text-xl text-muted-foreground">
			{NUM_BLEEPS} sounds, generated on chain, owned by their holders.
		</p>
		<p class="mb-8 max-w-2xl text-lg">
			Every Bleep is a note on one of nine instruments, synthesised in Solidity
			and rendered as sound by the contract itself. Compose them into melodies.
		</p>

		{#if $viewState.step === 'Loaded'}
			<p class="mb-8 text-sm text-muted-foreground">
				{$viewState.bleeps.minted} of {NUM_BLEEPS} minted, and the DAO holds
				{formatBalance($viewState.bleeps.treasury)} ETH.
			</p>
		{/if}

		<div class="mb-8 flex flex-wrap justify-center gap-4">
			<Button
				href={route('/editor/')}
				size="lg"
				class="min-w-40 bg-linear-to-r from-pink-600 via-pink-500 to-rose-500 font-semibold text-white shadow-lg transition-all duration-300 hover:from-pink-700 hover:via-pink-600 hover:to-rose-600 hover:shadow-xl"
				>Compose a melody</Button
			>
		</div>
	</div>
</div>
