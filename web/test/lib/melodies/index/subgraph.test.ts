import {describe, expect, it, vi, beforeEach, afterEach} from 'vitest';
import {createSubgraphMelodyIndex} from '$lib/melodies/index/subgraph';
import {encodeMelodyToChainData, emptyMelody} from '$lib/melodies/melody';

const ENDPOINT = 'http://indexer.test/graphql';
const CREATOR = '0xAAAAaaaaAAAAaaaaAAAAaaaaAAAAaaaaAAAAaaaa';
const OWNER = '0xBBBBbbbbBBBBbbbbBBBBbbbbBBBBbbbbBBBBbbbb';

function melodyWithNotes() {
	const melody = emptyMelody();
	melody.name = 'a tune';
	melody.speed = 20;
	melody.slots[2] = {note: 30, instrument: 4, volume: 6};
	return melody;
}

function reply(melodies: unknown[]) {
	return {
		ok: true,
		json: async () => ({data: {melodies}}),
	} as unknown as Response;
}

let fetchMock: ReturnType<typeof vi.fn>;
beforeEach(() => {
	fetchMock = vi.fn();
	vi.stubGlobal('fetch', fetchMock);
});
afterEach(() => vi.unstubAllGlobals());

describe('the subgraph melody index', () => {
	it('decodes a revealed melody into slots', async () => {
		const melody = melodyWithNotes();
		const {data1, data2} = encodeMelodyToChainData(melody);
		fetchMock.mockResolvedValue(
			reply([
				{
					id: '7',
					name: 'a tune',
					owner: {id: OWNER},
					creator: {id: CREATOR},
					data1,
					data2,
					speed: 20,
					revealed: true,
					minted: true,
					reserveTimestamp: '1700000000',
				},
			]),
		);

		const [indexed] = await createSubgraphMelodyIndex(ENDPOINT).list({});

		expect(indexed.id).toEqual('7');
		expect(indexed.owner).toEqual(OWNER);
		expect(indexed.minted).toBe(true);
		// consumers never see data1/data2
		expect(indexed.melody).toEqual(melody);
		// seconds on the wire, ms in the app
		expect(indexed.reservedAt).toEqual(1700000000000);
	});

	it('leaves an unrevealed melody without slots', async () => {
		// before reveal there is nothing on chain but a pair of hashes
		fetchMock.mockResolvedValue(
			reply([
				{
					id: '8',
					name: null,
					owner: null,
					creator: {id: CREATOR},
					data1: null,
					data2: null,
					speed: null,
					revealed: false,
					minted: false,
					reserveTimestamp: '1700000001',
				},
			]),
		);

		const [indexed] = await createSubgraphMelodyIndex(ENDPOINT).list({});

		expect(indexed.melody).toBeUndefined();
		expect(indexed.owner).toBeUndefined();
		expect(indexed.revealed).toBe(false);
	});

	it('filters by owner, lower-cased as the index stores them', async () => {
		fetchMock.mockResolvedValue(reply([]));

		await createSubgraphMelodyIndex(ENDPOINT).list({
			owner: OWNER as `0x${string}`,
		});

		const body = JSON.parse(fetchMock.mock.calls[0][1].body);
		expect(body.query).toContain(`owner: "${OWNER.toLowerCase()}"`);
		expect(body.query).toContain('orderDirection: desc');
	});

	it('reports an HTTP failure', async () => {
		fetchMock.mockResolvedValue({
			ok: false,
			status: 502,
			statusText: 'Bad Gateway',
		} as Response);

		await expect(createSubgraphMelodyIndex(ENDPOINT).list({})).rejects.toThrow(
			/502/,
		);
	});

	it('reports GraphQL errors, which come back with HTTP 200', async () => {
		fetchMock.mockResolvedValue({
			ok: true,
			json: async () => ({errors: [{message: 'no such field'}]}),
		} as unknown as Response);

		await expect(createSubgraphMelodyIndex(ENDPOINT).list({})).rejects.toThrow(
			/no such field/,
		);
	});

	it('copes with an empty result', async () => {
		fetchMock.mockResolvedValue({
			ok: true,
			json: async () => ({data: {}}),
		} as unknown as Response);

		expect(await createSubgraphMelodyIndex(ENDPOINT).list({})).toEqual([]);
	});
});
