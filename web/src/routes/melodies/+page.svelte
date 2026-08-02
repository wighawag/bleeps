<script lang="ts">
	import DefaultHead from '$lib/metadata/DefaultHead.svelte';
	import {getAppContext} from '$lib';
	import MelodyList from '$lib/melodies/MelodyList.svelte';
	import {createMelodyIndex} from '$lib/melodies/index';
	import {createMelodyList} from './lib/list';
	import RequiresMelodies from '$lib/melodies/RequiresMelodies.svelte';

	const {viewState} = getAppContext();

	const index = createMelodyIndex();
	const melodies = createMelodyList({index, query: {first: 50}});

	const pending = $derived(
		$viewState.step === 'Loaded' ? $viewState.bleeps.pendingMelodies : [],
	);
</script>

<RequiresMelodies>
	<DefaultHead title="Melodies" />

	<div class="container mx-auto max-w-6xl px-4 py-8">
		<header class="mb-8 text-center">
			<h1 class="text-3xl font-bold">Melodies</h1>
			<p class="mt-2 text-sm text-muted-foreground">
				Composed out of Bleeps, rendered on chain.
			</p>
		</header>

		<MelodyList result={$melodies} {pending} />
	</div>
</RequiresMelodies>
