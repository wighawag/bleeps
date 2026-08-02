import {describe, expect, it} from 'vitest';
import {mergePendingMelodies, pendingMelodiesFrom} from '$lib/view/index';

function op(overrides: Record<string, unknown> = {}) {
	return {
		metadata: {
			type: 'functionCall',
			functionName: 'reserveAndMint',
			args: ['a tune', 16, '0x00', '0x00', '0xabc'],
		},
		transactionIntent: {state: undefined},
		...overrides,
	};
}

describe('pendingMelodiesFrom', () => {
	it('finds a just-submitted mint', () => {
		// no state yet: broadcast, nothing known about it
		expect(pendingMelodiesFrom({one: op()})).toEqual([
			{operationID: 'one', name: 'a tune'},
		]);
	});

	it('keeps counting it while it sits in the mempool', () => {
		const pending = pendingMelodiesFrom({
			one: op({transactionIntent: {state: {inclusion: 'InMemPool'}}}),
		});
		expect(pending).toHaveLength(1);
	});

	it('stops counting it once included', () => {
		// the chain read is the source of truth from here; counting it again would
		// show the melody twice until the operation is pruned
		const pending = pendingMelodiesFrom({
			one: op({
				transactionIntent: {state: {inclusion: 'Included', status: 'Success'}},
			}),
		});
		expect(pending).toEqual([]);
	});

	it('stops counting an included failure too', () => {
		const pending = pendingMelodiesFrom({
			one: op({
				transactionIntent: {state: {inclusion: 'Included', status: 'Failure'}},
			}),
		});
		expect(pending).toEqual([]);
	});

	it('drops one that will never land', () => {
		for (const inclusion of ['NotFound', 'Dropped']) {
			expect(
				pendingMelodiesFrom({
					one: op({transactionIntent: {state: {inclusion}}}),
				}),
			).toEqual([]);
		}
	});

	it('ignores operations that are not melody mints', () => {
		const pending = pendingMelodiesFrom({
			one: op({
				metadata: {
					type: 'functionCall',
					functionName: 'transferFrom',
					args: [],
				},
			}),
			two: op({metadata: {type: 'unknown', name: 'something'}}),
		});
		expect(pending).toEqual([]);
	});

	it('copes with no operations at all', () => {
		expect(pendingMelodiesFrom(undefined)).toEqual([]);
		expect(pendingMelodiesFrom({})).toEqual([]);
	});

	it('falls back to a name when the args are missing', () => {
		const pending = pendingMelodiesFrom({
			one: op({
				metadata: {type: 'functionCall', functionName: 'reserveAndMint'},
			}),
		});
		expect(pending[0].name).toEqual('untitled');
	});
});

function opWithTx(
	name: string,
	tx: {nonce?: number; broadcastTimestampMs?: number},
) {
	return {
		metadata: {
			type: 'functionCall',
			functionName: 'reserveAndMint',
			args: [name, 16, '0x00', '0x00', '0xabc'],
			tx,
		},
		transactionIntent: {state: undefined},
	};
}

describe('pendingMelodiesFrom, when two operations claim one melody', () => {
	// A melody name is permanently unique on chain (`_nameHashes`), so of two
	// in-flight mints of one name at most one can ever succeed. Showing both
	// would promise the user a melody the chain will not deliver.

	it('keeps the higher nonce', () => {
		const pending = pendingMelodiesFrom({
			first: opWithTx('a tune', {nonce: 4, broadcastTimestampMs: 2_000}),
			second: opWithTx('a tune', {nonce: 5, broadcastTimestampMs: 1_000}),
		});
		expect(pending).toEqual([{operationID: 'second', name: 'a tune'}]);
	});

	it('falls back to the later broadcast at the same nonce', () => {
		// two attempts at one nonce: a replacement. Only one can be mined.
		const pending = pendingMelodiesFrom({
			first: opWithTx('a tune', {nonce: 7, broadcastTimestampMs: 1_000}),
			second: opWithTx('a tune', {nonce: 7, broadcastTimestampMs: 9_000}),
		});
		expect(pending).toEqual([{operationID: 'second', name: 'a tune'}]);
	});

	it('breaks a full tie on the operationID, whichever order they arrive in', () => {
		const tx = {nonce: 7, broadcastTimestampMs: 1_000};
		const forwards = pendingMelodiesFrom({
			aaa: opWithTx('a tune', tx),
			bbb: opWithTx('a tune', tx),
		});
		const backwards = pendingMelodiesFrom({
			bbb: opWithTx('a tune', tx),
			aaa: opWithTx('a tune', tx),
		});
		expect(forwards).toEqual([{operationID: 'bbb', name: 'a tune'}]);
		expect(backwards).toEqual(forwards);
	});

	it('leaves two different melodies alone, newest first', () => {
		const pending = pendingMelodiesFrom({
			older: opWithTx('first tune', {nonce: 1, broadcastTimestampMs: 1_000}),
			newer: opWithTx('second tune', {nonce: 2, broadcastTimestampMs: 2_000}),
		});
		expect(pending.map((melody) => melody.name)).toEqual([
			'second tune',
			'first tune',
		]);
	});
});

describe('mergePendingMelodies', () => {
	function indexed(name: string) {
		return {
			id: '1',
			creator: '0xaaa' as `0x${string}`,
			minted: true,
			revealed: true,
			reservedAt: 0,
			melody: {name, speed: 16, slots: []},
		};
	}

	it('drops a pending melody the index already lists', () => {
		// the indexer can be quicker than the transaction observer's next poll, and
		// then the same melody is both listed and pending
		const merged = mergePendingMelodies(
			[indexed('a tune')],
			[{operationID: 'one', name: 'a tune'}],
		);
		expect(merged).toEqual([]);
	});

	it('keeps one the index has not caught up with', () => {
		const merged = mergePendingMelodies(
			[indexed('another tune')],
			[{operationID: 'one', name: 'a tune'}],
		);
		expect(merged).toEqual([{operationID: 'one', name: 'a tune'}]);
	});

	it('ignores unrevealed melodies, which have no name to match on', () => {
		const unrevealed = {
			id: '2',
			creator: '0xaaa' as `0x${string}`,
			minted: false,
			revealed: false,
			reservedAt: 0,
		};
		const merged = mergePendingMelodies(
			[unrevealed],
			[{operationID: 'one', name: 'a tune'}],
		);
		expect(merged).toHaveLength(1);
	});
});
