import {describe, expect, it, vi, beforeEach} from 'vitest';
import {get} from 'svelte/store';
import type {MelodyIndex} from '$lib/melodies/index';

// `dev` decides whether the no-index message names an environment variable, so
// the test drives it rather than inheriting whatever vitest's mode implies.
const environment = vi.hoisted(() => ({dev: false}));
vi.mock('$app/environment', () => environment);

const {createMelodyList} =
	await import('../../../src/routes/melodies/lib/list');

beforeEach(() => {
	environment.dev = false;
});

describe('createMelodyList without an index', () => {
	it('reports Unavailable, not Failed: a build with no indexer is not broken', () => {
		const result = get(createMelodyList({index: undefined, query: {}}));
		expect(result.step).toBe('Unavailable');
	});

	it('tells a visitor what still works and names no environment variable', () => {
		const result = get(createMelodyList({index: undefined, query: {}}));
		if (result.step !== 'Unavailable') throw new Error('expected Unavailable');
		expect(result.message).not.toContain('PUBLIC_SUBGRAPH_URL');
		expect(result.message).toContain('minting');
	});

	it('names the variable in dev, where a developer is the one reading it', () => {
		environment.dev = true;
		const result = get(createMelodyList({index: undefined, query: {}}));
		if (result.step !== 'Unavailable') throw new Error('expected Unavailable');
		expect(result.message).toContain('PUBLIC_SUBGRAPH_URL');
	});
});

describe('createMelodyList with an index', () => {
	it('reports Failed when the index errors, keeping that distinct from Unavailable', async () => {
		const index: MelodyIndex = {
			list: async () => {
				throw new Error('the indexer answered 500');
			},
		};

		const store = createMelodyList({index, query: {}});
		// subscribing starts the poll; the first attempt settles on a microtask
		const seen: string[] = [];
		const stop = store.subscribe((r) => seen.push(r.step));
		await vi.waitFor(() => expect(seen).toContain('Failed'));
		stop();

		expect(seen).not.toContain('Unavailable');
	});
});
