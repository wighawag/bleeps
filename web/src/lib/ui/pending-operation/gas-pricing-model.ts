import {formatGwei, parseGwei} from 'viem';
import type {GasPrice} from '$lib/core/connection/gasFee';
import {
	bumpForReplacement,
	isValidReplacement,
	minReplacementFee,
	type GasReplacementPolicy,
} from '$lib/core/connection/gas-replacement';

export type GasOption = 'slow' | 'average' | 'fast' | 'custom';

export type GasTiers = {slow: GasPrice; average: GasPrice; fast: GasPrice};

export type GasPricingModel = {
	/** Preset tiers adjusted so each meets the replacement minimum. */
	gasPrices: GasTiers | null;
	/** Which presets were bumped because the network price was below the minimum. */
	adjustedOptions: {slow: boolean; average: boolean; fast: boolean};
	/** True when all three tiers collapse to the same price (idle chains). */
	tiersIdentical: boolean;
	/** Default value for the custom field (fast, or the minimum if fast is too low). */
	defaultCustomGasPrice: string;
	/** The gas price for the current selection, or null when invalid. */
	selectedGasPrice: GasPrice | null;
	/** Whether the selected price is a valid replacement. */
	isSelectedPriceValid: boolean;
	/** Human-facing error when the selected price is below the minimum. */
	minPriceError: string | null;
};

// A resubmit must EXCEED the previous fee (not merely equal it), or the mempool
// sees an identical tx and rejects it.
function enforceMinimum(
	price: GasPrice,
	minGasPrice: GasPrice | undefined,
	policy: GasReplacementPolicy | undefined,
): GasPrice {
	if (!minGasPrice) return price;
	return bumpForReplacement(price, minGasPrice, policy);
}

function meetsMinimum(
	price: GasPrice,
	minGasPrice: GasPrice | undefined,
	policy: GasReplacementPolicy | undefined,
): boolean {
	if (!minGasPrice) return true;
	return isValidReplacement(price, minGasPrice, policy);
}

function parseCustomGasPrice(customGasPrice: string): GasPrice | null {
	try {
		const gwei = parseGwei(customGasPrice);
		return {maxFeePerGas: gwei, maxPriorityFeePerGas: gwei};
	} catch {
		return null;
	}
}

/**
 * Compute everything the resubmit gas form needs to render and validate, from
 * the raw network tiers, the selection, and the replacement constraints.
 *
 * Pure: the `.svelte` file only binds `selectedOption`/`customGasPrice` state
 * and passes them (plus the loaded gas fee) here.
 */
export function computeGasPricingModel(params: {
	rawGasPrices: GasTiers | null;
	minGasPrice?: GasPrice;
	replacementPolicy?: GasReplacementPolicy;
	selectedOption: GasOption;
	customGasPrice: string;
}): GasPricingModel {
	const {
		rawGasPrices,
		minGasPrice,
		replacementPolicy,
		selectedOption,
		customGasPrice,
	} = params;

	const gasPrices: GasTiers | null = rawGasPrices
		? {
				slow: enforceMinimum(rawGasPrices.slow, minGasPrice, replacementPolicy),
				average: enforceMinimum(
					rawGasPrices.average,
					minGasPrice,
					replacementPolicy,
				),
				fast: enforceMinimum(rawGasPrices.fast, minGasPrice, replacementPolicy),
			}
		: null;

	const adjustedOptions = rawGasPrices
		? {
				slow: !meetsMinimum(rawGasPrices.slow, minGasPrice, replacementPolicy),
				average: !meetsMinimum(
					rawGasPrices.average,
					minGasPrice,
					replacementPolicy,
				),
				fast: !meetsMinimum(rawGasPrices.fast, minGasPrice, replacementPolicy),
			}
		: {slow: false, average: false, fast: false};

	const tiersIdentical = gasPrices
		? gasPrices.slow.maxFeePerGas === gasPrices.average.maxFeePerGas &&
			gasPrices.average.maxFeePerGas === gasPrices.fast.maxFeePerGas &&
			gasPrices.slow.maxPriorityFeePerGas ===
				gasPrices.average.maxPriorityFeePerGas &&
			gasPrices.average.maxPriorityFeePerGas ===
				gasPrices.fast.maxPriorityFeePerGas
		: false;

	let defaultCustomGasPrice = '';
	if (gasPrices) {
		defaultCustomGasPrice = formatGwei(gasPrices.fast.maxFeePerGas);
	} else if (minGasPrice) {
		defaultCustomGasPrice = formatGwei(minGasPrice.maxFeePerGas);
	}

	const selectedGasPrice: GasPrice | null =
		selectedOption === 'custom'
			? parseCustomGasPrice(customGasPrice)
			: gasPrices
				? gasPrices[selectedOption]
				: null;

	const isSelectedPriceValid = selectedGasPrice
		? meetsMinimum(selectedGasPrice, minGasPrice, replacementPolicy)
		: false;

	let minPriceError: string | null = null;
	if (selectedGasPrice && minGasPrice && !isSelectedPriceValid) {
		const min = minReplacementFee(minGasPrice.maxFeePerGas, replacementPolicy);
		minPriceError = `Gas price must be greater than the previous transaction's (at least ${formatGwei(min)} gwei)`;
	}

	return {
		gasPrices,
		adjustedOptions,
		tiersIdentical,
		defaultCustomGasPrice,
		selectedGasPrice,
		isSelectedPriceValid,
		minPriceError,
	};
}
