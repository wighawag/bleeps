import type {GasPrice} from './gasFee';

/**
 * How much a replacement (resubmit/cancel) transaction must raise the fee over
 * the transaction it replaces.
 *
 * A replacement MUST be strictly higher than the original, or the mempool sees
 * an identical tx and rejects it (same hash). This policy is the minimum bump.
 *
 * - `percent`: minimum increase as a percentage of the previous fee (default
 *   12.5, the common EIP-1559 replacement threshold). Set to 0 to rely only on
 *   `minWei` (i.e. behaviour "+1 wei").
 * - `minWei`: absolute minimum increase in wei (default 1n), a floor so tiny
 *   fees (e.g. on a local node) still strictly increase when the percentage
 *   rounds to nothing.
 */
export type GasReplacementPolicy = {
	percent?: number;
	minWei?: bigint;
};

export const DEFAULT_GAS_REPLACEMENT_POLICY: Required<GasReplacementPolicy> = {
	percent: 12.5,
	minWei: 1n,
};

/**
 * The minimum fee that would be accepted as a replacement for `previous`:
 * `previous` raised by the larger of `percent`% (rounded up) and `minWei`.
 */
export function minReplacementFee(
	previous: bigint,
	policy: GasReplacementPolicy = {},
): bigint {
	const percent = policy.percent ?? DEFAULT_GAS_REPLACEMENT_POLICY.percent;
	const minWei = policy.minWei ?? DEFAULT_GAS_REPLACEMENT_POLICY.minWei;

	// Ceil division to keep everything in bigint: previous * percent / 100.
	const scale = BigInt(Math.round(percent * 100)); // percent as basis-points*100
	const percentIncrease = (previous * scale + 9999n) / 10000n;
	const increase = percentIncrease > minWei ? percentIncrease : minWei;
	return previous + increase;
}

/**
 * Ensure a chosen gas price is a valid replacement for `previous`: each field is
 * raised to at least its minimum replacement fee. Already-higher fields are kept.
 */
export function bumpForReplacement(
	price: GasPrice,
	previous: GasPrice,
	policy: GasReplacementPolicy = {},
): GasPrice {
	const minMaxFee = minReplacementFee(previous.maxFeePerGas, policy);
	const minPriority = minReplacementFee(previous.maxPriorityFeePerGas, policy);
	return {
		maxFeePerGas:
			price.maxFeePerGas > minMaxFee ? price.maxFeePerGas : minMaxFee,
		maxPriorityFeePerGas:
			price.maxPriorityFeePerGas > minPriority
				? price.maxPriorityFeePerGas
				: minPriority,
	};
}

/**
 * Whether a chosen gas price is strictly a valid replacement for `previous`:
 * BOTH fields must be at least the minimum replacement fee (i.e. strictly above
 * the previous fee). Reusing the exact previous price is NOT valid.
 */
export function isValidReplacement(
	price: GasPrice,
	previous: GasPrice,
	policy: GasReplacementPolicy = {},
): boolean {
	return (
		price.maxFeePerGas >= minReplacementFee(previous.maxFeePerGas, policy) &&
		price.maxPriorityFeePerGas >=
			minReplacementFee(previous.maxPriorityFeePerGas, policy)
	);
}
