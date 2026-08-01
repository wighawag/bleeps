import {decodeMelodyFromChainData, DEFAULT_SPEED} from '$lib/melodies/melody';
import type {IndexedMelody, MelodyIndex, MelodyQuery} from './types';

/**
 * A `MelodyIndex` backed by a subgraph.
 *
 * The only file in the app that knows GraphQL. Everything it returns is already
 * in the app's shape, so replacing this with our own indexer is one new file
 * implementing `MelodyIndex` plus a change of import.
 */

/** What the subgraph gives back, before it is turned into an IndexedMelody. */
type SubgraphMelody = {
	id: string;
	name: string | null;
	owner: {id: string} | null;
	creator: {id: string};
	data1: string | null;
	data2: string | null;
	speed: number | null;
	revealed: boolean;
	minted: boolean;
	reserveTimestamp: string;
};

const MELODY_FIELDS = `
	id
	name
	owner {id}
	creator {id}
	data1
	data2
	speed
	revealed
	minted
	reserveTimestamp
`;

function toIndexedMelody(raw: SubgraphMelody): IndexedMelody {
	// data1/data2/speed only exist once revealed; an unrevealed melody is just a
	// pair of hashes on chain, so there is nothing to decode.
	const melody =
		raw.revealed && raw.data1 && raw.data2
			? decodeMelodyFromChainData({
					name: raw.name ?? '',
					speed: raw.speed ?? DEFAULT_SPEED,
					data1: raw.data1,
					data2: raw.data2,
				})
			: undefined;

	return {
		id: raw.id,
		creator: raw.creator.id as `0x${string}`,
		owner: raw.owner ? (raw.owner.id as `0x${string}`) : undefined,
		minted: raw.minted,
		revealed: raw.revealed,
		// the subgraph stores seconds; the rest of the app works in ms
		reservedAt: parseInt(raw.reserveTimestamp, 10) * 1000,
		melody,
	};
}

export function createSubgraphMelodyIndex(endpoint: string): MelodyIndex {
	return {
		async list(query: MelodyQuery): Promise<IndexedMelody[]> {
			const where: string[] = [];
			if (query.owner) {
				where.push(`owner: "${query.owner.toLowerCase()}"`);
			}
			if (query.creator) {
				where.push(`creator: "${query.creator.toLowerCase()}"`);
			}
			const filter = where.length ? `, where: {${where.join(', ')}}` : '';

			const gql = `query {
				melodies(orderBy: reserveTimestamp, orderDirection: desc, first: ${query.first ?? 50}${filter}) {
					${MELODY_FIELDS}
				}
			}`;

			const response = await fetch(endpoint, {
				method: 'POST',
				headers: {'content-type': 'application/json'},
				body: JSON.stringify({query: gql}),
			});

			if (!response.ok) {
				throw new Error(
					`the indexer answered ${response.status} ${response.statusText}`,
				);
			}

			const body = await response.json();
			if (body.errors?.length) {
				throw new Error(
					body.errors[0]?.message ?? 'the indexer returned errors',
				);
			}

			const melodies: SubgraphMelody[] = body.data?.melodies ?? [];
			return melodies.map(toIndexedMelody);
		},
	};
}
