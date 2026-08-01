import {describe, expect, it} from 'vitest';
import {pendingMelodiesFrom} from '$lib/view/index';

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
