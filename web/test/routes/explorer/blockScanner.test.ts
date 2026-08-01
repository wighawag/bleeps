import {describe, it, expect} from 'vitest';
import type {Transaction} from 'viem';
import {
	calculateBlocksToFetch,
	blockToTransactionSummaries,
	type BlockIndexEntry,
} from '../../../src/routes/explorer/lib/services/blockScanner';

function entry(blockNumber: number, txCount: number): BlockIndexEntry {
	return {blockNumber, txCount, timestamp: 0};
}

function index(entries: BlockIndexEntry[]): Map<number, BlockIndexEntry> {
	return new Map(entries.map((e) => [e.blockNumber, e]));
}

describe('calculateBlocksToFetch', () => {
	it('returns blocks newest-first until the target tx count is met', () => {
		const idx = index([entry(10, 3), entry(9, 3), entry(8, 3)]);
		// Need 5 txs: block 10 gives 3, block 9 crosses the threshold (6 >= 5).
		expect(calculateBlocksToFetch(idx, 10, 5)).toEqual([10, 9]);
	});

	it('stops at the first block once the target is already satisfied', () => {
		const idx = index([entry(10, 8), entry(9, 8)]);
		expect(calculateBlocksToFetch(idx, 10, 5)).toEqual([10]);
	});

	it('skips blocks newer than the latest block', () => {
		const idx = index([entry(12, 5), entry(10, 5), entry(9, 5)]);
		// latestBlock is 10, so block 12 is excluded.
		expect(calculateBlocksToFetch(idx, 10, 3)).toEqual([10]);
	});

	it('returns every known block when the target cannot be reached', () => {
		const idx = index([entry(10, 1), entry(9, 1)]);
		expect(calculateBlocksToFetch(idx, 10, 100)).toEqual([10, 9]);
	});

	it('returns an empty list for an empty index', () => {
		expect(calculateBlocksToFetch(index([]), 10, 5)).toEqual([]);
	});
});

describe('blockToTransactionSummaries', () => {
	const tx = (over: Partial<Transaction>): Transaction =>
		({
			hash: '0xhash',
			from: '0xfrom',
			to: '0xto',
			value: 100n,
			type: 'eip1559',
			...over,
		}) as unknown as Transaction;

	it('maps each transaction to a summary carrying the block number and timestamp', () => {
		const out = blockToTransactionSummaries({
			number: 42n,
			timestamp: 1700000000n,
			transactions: [tx({hash: '0xa'}), tx({hash: '0xb'})],
		});
		expect(out).toHaveLength(2);
		expect(out[0]).toMatchObject({
			hash: '0xa',
			blockNumber: 42n,
			timestamp: 1700000000,
		});
		expect(out[1].hash).toBe('0xb');
	});

	it('accepts a numeric block timestamp as well as a bigint', () => {
		const out = blockToTransactionSummaries({
			number: 1n,
			timestamp: 123 as unknown as number,
			transactions: [tx({})],
		});
		expect(out[0].timestamp).toBe(123);
	});

	it('normalises a falsy recipient to null (contract creation)', () => {
		const out = blockToTransactionSummaries({
			number: 1n,
			timestamp: 0n,
			transactions: [tx({to: null as unknown as `0x${string}`})],
		});
		expect(out[0].to).toBeNull();
	});

	it('stringifies the transaction type', () => {
		const out = blockToTransactionSummaries({
			number: 1n,
			timestamp: 0n,
			transactions: [tx({type: 'legacy'})],
		});
		expect(out[0].type).toBe('legacy');
	});

	it('returns an empty list for a block with no transactions', () => {
		expect(
			blockToTransactionSummaries({
				number: 1n,
				timestamp: 0n,
				transactions: [],
			}),
		).toEqual([]);
	});
});
