import {PUBLIC_SUBGRAPH_URL} from '$env/static/public';
import {HAS_MELODIES} from '$lib/navigation';
import {resolveURLForThisPage} from '$lib/core/env/same-host';
import {createSubgraphMelodyIndex} from './subgraph';
import type {MelodyIndex} from './types';

export * from './types';

/**
 * The melody index the app uses.
 *
 * A subgraph today, our own indexer later; see ./types.ts. Returns undefined
 * when no endpoint is configured, so the app degrades to "melodies cannot be
 * listed" rather than failing to start: everything else, including composing
 * and minting, works without an indexer.
 *
 * Also undefined where the build has no MeloBleeps at all (mainnet): there is
 * nothing for an indexer to have indexed, so nothing asks one.
 *
 * The endpoint goes through `resolveURLForThisPage`, so `//:8000/...` means
 * "port 8000 on the host this page came from", as the node urls already do: a
 * dev stack opened from another machine reaches its own graph-node rather than
 * the visitor's loopback. During prerender there is no page, so that notation
 * resolves to undefined here and the browser resolves it on the first render.
 */
export function createMelodyIndex(): MelodyIndex | undefined {
	const url = resolveURLForThisPage(PUBLIC_SUBGRAPH_URL);
	if (!HAS_MELODIES || !url) {
		return undefined;
	}
	return createSubgraphMelodyIndex(url);
}
