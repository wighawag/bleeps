/**
 * The seam between the app and whatever is indexing melodies.
 *
 * Today that is a subgraph. It is not meant to stay one: the plan is our own
 * indexer, so nothing outside `lib/melodies/index/` knows about The Graph, its
 * query language or its response shape. Swapping the source is implementing
 * `MelodyIndex` once and changing where `createMelodyIndex` points.
 *
 * `IndexedMelody` is deliberately the app's shape, not the subgraph's: ids are
 * strings because token ids are unbounded, timestamps are milliseconds because
 * that is what the rest of the app uses, and the melody data is already decoded
 * into slots so a consumer never touches `data1`/`data2`.
 */
import type {MelodyInfo} from '$lib/melodies/melody';

export type IndexedMelody = {
	/** The token id, as a decimal string. */
	id: string;
	/** Who composed it. */
	creator: `0x${string}`;
	/** Who holds it, absent until it is minted. */
	owner?: `0x${string}`;
	minted: boolean;
	revealed: boolean;
	/** When it was reserved, in ms. */
	reservedAt: number;
	/**
	 * The melody itself, present once revealed. An unrevealed melody is only a
	 * pair of hashes on chain, so there is nothing to show but its existence.
	 */
	melody?: MelodyInfo;
};

export type MelodyIndexResult =
	| {step: 'Loading'}
	| {step: 'Loaded'; melodies: IndexedMelody[]}
	/**
	 * This build has no index at all, so melodies cannot be browsed and never
	 * will be until one is configured. Distinct from `Failed` on purpose: it is a
	 * known, permanent property of the deployment rather than something going
	 * wrong, so it must not be presented to a visitor as an error.
	 */
	| {step: 'Unavailable'; message: string}
	/** An index exists and did not answer. This one IS an error. */
	| {step: 'Failed'; message: string};

export type MelodyQuery = {
	/** Most recent first. */
	first?: number;
	/** Only melodies held by this address. */
	owner?: `0x${string}`;
	/** Only melodies composed by this address. */
	creator?: `0x${string}`;
};

export type MelodyIndex = {
	list(query: MelodyQuery): Promise<IndexedMelody[]>;
};
