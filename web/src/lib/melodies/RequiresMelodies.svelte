<script lang="ts">
	import type {Snippet} from 'svelte';
	import {HAS_MELODIES} from '$lib/navigation';

	/**
	 * A page that only exists where melodies do.
	 *
	 * On a build with MeloBleeps this renders its children and does nothing else.
	 * On one without (mainnet), the page is not in the site: no tab points at it
	 * and no HTML is prerendered for it.
	 *
	 * SENDING THE VISITOR HOME IS NOT DONE HERE ANY MORE. It lives in each
	 * route's `+page.ts` load, which is where routing decisions belong and which
	 * runs BEFORE anything renders, so there is no flash of an empty page first.
	 * This component used to call `goto` from `$app/navigation`, which made it
	 * one of two files in the tree naming the framework outside `$lib/kit` (see
	 * test/framework-boundary.test.ts and ADR-0004 on the `work` branch). The
	 * navigation service deliberately covers history and location, not route
	 * changes, so there was nothing framework-free to move it to.
	 *
	 * What remains is the RENDER guard, kept deliberately: a redirect is a
	 * navigation and can be raced or blocked, and rendering an editor with no
	 * contract behind it is worse than rendering nothing.
	 *
	 * `HAS_MELODIES` is a build-time constant, so on mainnet the whole melody
	 * branch is dead code and the bundler drops it.
	 */
	let {children}: {children: Snippet} = $props();
</script>

{#if HAS_MELODIES}
	{@render children()}
{/if}
