import {describe, it, expect, vi, beforeEach, afterEach} from 'vitest';
import {get} from 'svelte/store';
import {NUM_BLEEPS, createOnchainState} from '$lib/onchain/state';
import type {PublicClient} from 'viem';
import type {TypedDeployments} from '$lib/core/connection/types';

const BLEEPS = '0xaAaAaAaAaAaAaAaAaAaAaAaAaAaAaAaAaAaAaAaA' as const;
const DAO = '0xbBbBbBbBbBbBbBbBbBbBbBbBbBbBbBbBbBbBbBbB' as const;
const OWNER = '0xcCcCcCcCcCcCcCcCcCcCcCcCcCcCcCcCcCcCcCcC' as const;

// onchainState only reads the two contracts' address/abi (spread into
// readContract) so a minimal stub suffices.
const deployments = {
	contracts: {
		Bleeps: {address: BLEEPS, abi: []},
		BleepsDAOAccount: {address: DAO, abi: []},
	},
} as unknown as TypedDeployments;

function activate<T>(store: {subscribe: (r: (v: T) => void) => () => void}) {
	return store.subscribe(() => {});
}

describe('createOnchainState (adapter)', () => {
	beforeEach(() => vi.useFakeTimers());
	afterEach(() => vi.useRealTimers());

	it('reads the whole owners table and the DAO balance', async () => {
		const owners = Array.from({length: NUM_BLEEPS}, () => OWNER);
		const readContract = vi.fn(async () => owners);
		const getBalance = vi.fn(async () => 42n);
		const publicClient = {readContract, getBalance} as unknown as PublicClient;

		const store = createOnchainState({publicClient, deployments, config: {}});
		const off = activate(store);

		await vi.waitFor(() => {
			expect(get(store).step).toBe('Loaded');
		});

		expect(get(store)).toEqual({step: 'Loaded', owners, treasury: 42n});

		// One batched call for all 576, which is what the contract offers and what
		// the grid needs; 576 individual calls would be unusable.
		expect(readContract).toHaveBeenCalledTimes(1);
		const calls = readContract.mock.calls as unknown as {
			functionName: string;
			args: [bigint[]];
		}[][];
		const call = calls[0][0];
		expect(call.functionName).toBe('owners');
		expect(call.args[0]).toHaveLength(NUM_BLEEPS);
		expect(call.args[0][0]).toBe(0n);
		expect(call.args[0][NUM_BLEEPS - 1]).toBe(BigInt(NUM_BLEEPS - 1));

		expect(getBalance).toHaveBeenCalledWith({address: DAO});
		off();
	});

	it('records an error when the read fails', async () => {
		const readContract = vi.fn(async () => {
			throw new Error('revert');
		});
		const getBalance = vi.fn(async () => 0n);
		const publicClient = {readContract, getBalance} as unknown as PublicClient;

		const store = createOnchainState({publicClient, deployments, config: {}});
		const off = activate(store);

		await vi.waitFor(() => expect(get(store.status).error).toBeDefined());
		off();
	});
});
