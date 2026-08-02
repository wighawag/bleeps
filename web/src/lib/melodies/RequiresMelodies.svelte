<script lang="ts">
	import {onMount, type Snippet} from 'svelte';
	import {goto} from '$app/navigation';
	import {route} from '$lib';
	import {HAS_MELODIES} from '$lib/navigation';

	/**
	 * A page that only exists where melodies do.
	 *
	 * On a build with MeloBleeps this renders its children and does nothing else.
	 * On one without (mainnet), the page is not in the site: no tab points at it,
	 * no HTML is prerendered for it, and anybody who arrives anyway is sent home
	 * rather than shown an editor that has no contract to talk to.
	 *
	 * `HAS_MELODIES` is a build-time constant, so on mainnet the whole melody
	 * branch is dead code and the bundler drops it.
	 */
	let {children}: {children: Snippet} = $props();

	onMount(() => {
		if (!HAS_MELODIES) {
			goto(route('/'), {replaceState: true});
		}
	});
</script>

{#if HAS_MELODIES}
	{@render children()}
{/if}
