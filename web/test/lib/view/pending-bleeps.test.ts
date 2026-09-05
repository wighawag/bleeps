import {describe, expect, it} from 'vitest';
import {mergePendingBleeps, pendingBleepsFrom} from '$lib/view/index';

const BUYER = '0xAAAAaaaaAAAAaaaaAAAAaaaaAAAAaaaaAAAAaaaa';
const OTHER = '0xBBBBbbbbBBBBbbbbBBBBbbbbBBBBbbbbBBBBbbbb';
const ZERO = '0x0000000000000000000000000000000000000000';

function mint(
	overrides: {
		functionName?: string;
		args?: unknown[];
		attempts?: {nonce?: number; broadcastTimestampMs?: number}[];
		state?: {outcome?: string; inclusion?: string};
	} = {},
) {
	return {
		metadata: {
			type: 'functionCall',
			functionName: overrides.functionName ?? 'mintWithPassId',
			// every sale entry point takes (id, to) first
			args: overrides.args ?? [12, BUYER, 3n, []],
		},
		// Per ATTEMPT now: nonce and broadcast time describe one broadcast, and
		// an operation can hold several.
		attempts: overrides.attempts,
		state: overrides.state,
	};
}

describe('pendingBleepsFrom', () => {
	it('finds a purchase through any of the three entry points', () => {
		for (const functionName of ['mint', 'mintWithPassId', 'mintWithSalePass']) {
			expect(pendingBleepsFrom({one: mint({functionName})})).toEqual([
				{operationID: 'one', id: 12, to: BUYER},
			]);
		}
	});

	it('stops counting one the chain has taken', () => {
		expect(
			pendingBleepsFrom({
				one: mint({state: {inclusion: 'Included', outcome: 'Success'}}),
			}),
		).toEqual([]);
	});

	it('ignores anything that is not a purchase', () => {
		expect(
			pendingBleepsFrom({
				one: mint({functionName: 'transferFrom'}),
				two: mint({functionName: 'reserveAndMint'}),
			}),
		).toEqual([]);
	});

	it('keeps one entry when two transactions chase the same Bleep', () => {
		// a Bleep is minted once, so of two in-flight purchases at most one can
		// succeed: showing both would draw the tile twice
		const pending = pendingBleepsFrom({
			first: mint({attempts: [{nonce: 3, broadcastTimestampMs: 1_000}]}),
			second: mint({attempts: [{nonce: 4, broadcastTimestampMs: 500}]}),
		});
		expect(pending).toEqual([{operationID: 'second', id: 12, to: BUYER}]);
	});

	it('keeps purchases of different Bleeps apart', () => {
		const pending = pendingBleepsFrom({
			one: mint({args: [12, BUYER], attempts: [{nonce: 1}]}),
			two: mint({args: [13, BUYER], attempts: [{nonce: 2}]}),
		});
		expect(pending.map((bleep) => bleep.id)).toEqual([13, 12]);
	});
});

describe('mergePendingBleeps', () => {
	const owners = [ZERO, OTHER, ZERO] as `0x${string}`[];

	it('shows an unsettled purchase as the buyer', () => {
		const merged = mergePendingBleeps(owners, [
			{operationID: 'one', id: 0, to: BUYER},
		]);
		expect(merged[0]).toEqual(BUYER);
	});

	it('leaves the chain read alone where it has an owner', () => {
		// a pending purchase of a Bleep somebody already owns is a transaction
		// about to revert, not a change of ownership
		const merged = mergePendingBleeps(owners, [
			{operationID: 'one', id: 1, to: BUYER},
		]);
		expect(merged[1]).toEqual(OTHER);
	});

	it('returns the table untouched when nothing is pending', () => {
		expect(mergePendingBleeps(owners, [])).toBe(owners);
	});
});
