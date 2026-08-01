import {readable, type Readable} from 'svelte/store';
import type {
	MelodyIndex,
	MelodyIndexResult,
	MelodyQuery,
} from '$lib/melodies/index';

/**
 * A list of melodies from the index, refreshed on a timer.
 *
 * Polled rather than subscribed because the index is being replaced (see
 * lib/melodies/index/types.ts) and polling is the one thing every backend can
 * do. When our own indexer arrives with a push channel, this is where it lands.
 */
export function createMelodyList(params: {
	index: MelodyIndex | undefined;
	query: MelodyQuery;
	refreshInterval?: number;
}): Readable<MelodyIndexResult> {
	const {index, query, refreshInterval = 10_000} = params;

	if (!index) {
		return readable<MelodyIndexResult>({
			step: 'Failed',
			message:
				'No melody indexer is configured. Set PUBLIC_SUBGRAPH_URL to list melodies.',
		});
	}

	return readable<MelodyIndexResult>({step: 'Loading'}, (set) => {
		let live = true;
		let timer: ReturnType<typeof setTimeout> | undefined;

		async function poll() {
			try {
				const melodies = await index!.list(query);
				if (!live) return;
				set({step: 'Loaded', melodies});
			} catch (error) {
				if (!live) return;
				set({
					step: 'Failed',
					message:
						error instanceof Error
							? error.message
							: 'could not reach the melody indexer',
				});
			}
			if (live) {
				timer = setTimeout(poll, refreshInterval);
			}
		}
		void poll();

		return () => {
			live = false;
			if (timer) clearTimeout(timer);
		};
	});
}
