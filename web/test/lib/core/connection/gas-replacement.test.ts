import {describe, it, expect} from 'vitest';
import {
	minReplacementFee,
	bumpForReplacement,
	isValidReplacement,
	DEFAULT_GAS_REPLACEMENT_POLICY,
} from '$lib/core/connection/gas-replacement';

const price = (maxFeePerGas: bigint, maxPriorityFeePerGas = maxFeePerGas) => ({
	maxFeePerGas,
	maxPriorityFeePerGas,
});

describe('minReplacementFee', () => {
	it('raises by 12.5% (rounded up) by default', () => {
		// 1000 * 12.5% = 125 -> 1125
		expect(minReplacementFee(1000n)).toBe(1125n);
	});

	it('applies the +1 wei floor for tiny fees where the percent rounds to nothing', () => {
		// 7 * 12.5% = 0.875 -> ceil 1; increase max(1, minWei=1) = 1 -> 8
		expect(minReplacementFee(7n)).toBe(8n);
		// even 1 wei must strictly increase
		expect(minReplacementFee(1n)).toBe(2n);
	});

	it('supports behaviour "+1 wei" via percent: 0', () => {
		expect(minReplacementFee(1_000_000_000n, {percent: 0})).toBe(
			1_000_000_001n,
		);
	});

	it('honours a custom percent', () => {
		// +100% of 1000 = 2000
		expect(minReplacementFee(1000n, {percent: 100})).toBe(2000n);
	});
});

describe('bumpForReplacement', () => {
	it('bumps a price equal to the previous (the reuse-same-price bug)', () => {
		const previous = price(7n);
		const bumped = bumpForReplacement(previous, previous);
		expect(bumped.maxFeePerGas).toBe(8n);
		expect(bumped.maxPriorityFeePerGas).toBe(8n);
	});

	it('keeps a price already above the minimum replacement', () => {
		const previous = price(1000n);
		const chosen = price(5000n);
		expect(bumpForReplacement(chosen, previous)).toEqual(chosen);
	});

	it('bumps per field independently', () => {
		const previous = price(1000n, 500n);
		// maxFee already high, priority equal-to-previous -> only priority bumps
		const chosen = price(5000n, 500n);
		const bumped = bumpForReplacement(chosen, previous);
		expect(bumped.maxFeePerGas).toBe(5000n);
		expect(bumped.maxPriorityFeePerGas).toBe(minReplacementFee(500n));
	});
});

describe('isValidReplacement', () => {
	it('rejects the exact previous price', () => {
		const previous = price(7n);
		expect(isValidReplacement(previous, previous)).toBe(false);
	});

	it('accepts a strictly-bumped price', () => {
		const previous = price(7n);
		expect(
			isValidReplacement(bumpForReplacement(previous, previous), previous),
		).toBe(true);
	});

	it('requires BOTH fields to exceed the minimum', () => {
		const previous = price(1000n, 1000n);
		// maxFee ok, priority still at previous -> invalid
		expect(isValidReplacement(price(2000n, 1000n), previous)).toBe(false);
	});
});

describe('DEFAULT_GAS_REPLACEMENT_POLICY', () => {
	it('defaults to 12.5% / 1 wei', () => {
		expect(DEFAULT_GAS_REPLACEMENT_POLICY).toEqual({percent: 12.5, minWei: 1n});
	});
});
