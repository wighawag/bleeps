import {describe, it, expect, vi} from 'vitest';
import {readable} from 'svelte/store';
import {createBalanceCheckStore} from '$lib/core/transaction/balance-check-store';
import type {BalanceStore} from '$lib/core/connection/balance';
import type {GasFeeStore, GasPriceEstimates} from '$lib/core/connection/gasFee';
import type {PublicClient} from 'viem';

const ADDR = '0xaAaAaAaAaAaAaAaAaAaAaAaAaAaAaAaAaAaAaAaA' as const;

function fakeBalance(value: bigint): BalanceStore {
	return {
		subscribe: readable({step: 'Loaded', value} as const).subscribe,
		status: readable({loading: false}).subscribe as any,
		update: async () => ({step: 'Loaded', value}) as any,
	} as unknown as BalanceStore;
}

function fakeGasFee(estimate: GasPriceEstimates): GasFeeStore {
	return {
		subscribe: readable({step: 'Loaded', ...estimate} as const).subscribe,
		status: readable({loading: false}).subscribe as any,
		update: async () => ({step: 'Loaded', ...estimate}) as any,
	} as unknown as GasFeeStore;
}

// A realistic low-fee estimate (fresh local node): fast priority 1 gwei,
// maxFee just above it. The point of the fix is that the request carries the
// matching maxPriorityFeePerGas, never a bare maxFeePerGas.
const estimate: GasPriceEstimates = {
	slow: {maxFeePerGas: 300_000_000n, maxPriorityFeePerGas: 100_000_000n},
	average: {maxFeePerGas: 600_000_000n, maxPriorityFeePerGas: 500_000_000n},
	fast: {maxFeePerGas: 1_100_000_000n, maxPriorityFeePerGas: 1_000_000_000n},
	baseFeePerGas: 100_000_000n,
	higherThanExpected: false,
};

describe('balanceCheck.ensureCanAfford', () => {
	it('returns a request carrying BOTH maxFeePerGas and maxPriorityFeePerGas', async () => {
		const publicClient = {
			estimateContractGas: vi.fn(async () => 21_000n),
		} as unknown as PublicClient;

		const store = createBalanceCheckStore({
			publicClient,
			balance: fakeBalance(10n ** 18n), // plenty
			gasFee: fakeGasFee(estimate),
		});

		const request = await store.ensureCanAfford({
			contract: {
				address: ADDR,
				abi: [],
				functionName: 'setMessage',
				args: ['hi'],
				account: ADDR,
			},
		});

		// The fix: both fee fields present, from the chosen (default: fast) tier.
		expect(request.maxFeePerGas).toBe(estimate.fast.maxFeePerGas);
		expect(request.maxPriorityFeePerGas).toBe(
			estimate.fast.maxPriorityFeePerGas,
		);
		// Invariant that avoids "maxFeePerGas < maxPriorityFeePerGas".
		expect(request.maxFeePerGas! >= request.maxPriorityFeePerGas!).toBe(true);
		expect(request.gas).toBe(21_000n);
	});

	it('uses the requested speed tier', async () => {
		const publicClient = {
			estimateContractGas: vi.fn(async () => 21_000n),
		} as unknown as PublicClient;

		const store = createBalanceCheckStore({
			publicClient,
			balance: fakeBalance(10n ** 18n),
			gasFee: fakeGasFee(estimate),
		});

		const request = await store.ensureCanAfford(
			{
				contract: {
					address: ADDR,
					abi: [],
					functionName: 'setMessage',
					args: ['hi'],
					account: ADDR,
				},
			},
			{gasSpeed: 'slow'},
		);

		expect(request.maxFeePerGas).toBe(estimate.slow.maxFeePerGas);
		expect(request.maxPriorityFeePerGas).toBe(
			estimate.slow.maxPriorityFeePerGas,
		);
	});
});
