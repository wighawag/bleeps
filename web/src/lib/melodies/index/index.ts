import {PUBLIC_SUBGRAPH_URL} from '$env/static/public';
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
 */
export function createMelodyIndex(): MelodyIndex | undefined {
	if (!PUBLIC_SUBGRAPH_URL) {
		return undefined;
	}
	return createSubgraphMelodyIndex(PUBLIC_SUBGRAPH_URL);
}
