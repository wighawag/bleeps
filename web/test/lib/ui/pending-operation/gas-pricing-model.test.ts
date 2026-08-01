import {describe, it, expect} from 'vitest';
import {parseGwei} from 'viem';
import {computeGasPricingModel} from '../../../../src/lib/ui/pending-operation/gas-pricing-model';
import type {GasPrice} from '../../../../src/lib/core/connection/gasFee';

const gp = (
	maxFeePerGas: bigint,
	maxPriorityFeePerGas = maxFeePerGas,
): GasPrice => ({
	maxFeePerGas,
	maxPriorityFeePerGas,
});

const tiers = (slow: bigint, average: bigint, fast: bigint) => ({
	slow: gp(slow),
	average: gp(average),
	fast: gp(fast),
});

describe('computeGasPricingModel', () => {
	it('returns nulls when no network prices are loaded', () => {
		const model = computeGasPricingModel({
			rawGasPrices: null,
			selectedOption: 'fast',
			customGasPrice: '',
		});
		expect(model.gasPrices).toBeNull();
		expect(model.selectedGasPrice).toBeNull();
		expect(model.isSelectedPriceValid).toBe(false);
	});

	it('passes through network tiers when no minimum is enforced', () => {
		const model = computeGasPricingModel({
			rawGasPrices: tiers(10n, 20n, 30n),
			selectedOption: 'average',
			customGasPrice: '',
		});
		expect(model.gasPrices?.average.maxFeePerGas).toBe(20n);
		expect(model.selectedGasPrice?.maxFeePerGas).toBe(20n);
		expect(model.isSelectedPriceValid).toBe(true);
		expect(model.adjustedOptions).toEqual({
			slow: false,
			average: false,
			fast: false,
		});
	});

	it('bumps tiers below the replacement minimum and flags them', () => {
		// previous fee 1000 -> minimum replacement is 1125 (12.5%)
		const model = computeGasPricingModel({
			rawGasPrices: tiers(500n, 1000n, 2000n),
			minGasPrice: gp(1000n),
			selectedOption: 'slow',
			customGasPrice: '',
		});
		expect(model.gasPrices?.slow.maxFeePerGas).toBe(1125n);
		expect(model.gasPrices?.fast.maxFeePerGas).toBe(2000n);
		expect(model.adjustedOptions.slow).toBe(true);
		expect(model.adjustedOptions.fast).toBe(false);
		// slow was bumped to the minimum, so it is a valid replacement
		expect(model.isSelectedPriceValid).toBe(true);
		expect(model.minPriceError).toBeNull();
	});

	it('detects identical tiers (idle chain)', () => {
		const model = computeGasPricingModel({
			rawGasPrices: tiers(50n, 50n, 50n),
			selectedOption: 'fast',
			customGasPrice: '',
		});
		expect(model.tiersIdentical).toBe(true);
	});

	it('validates a custom price against the minimum and reports an error', () => {
		const model = computeGasPricingModel({
			rawGasPrices: tiers(10n, 20n, 30n),
			minGasPrice: gp(parseGwei('100')),
			selectedOption: 'custom',
			customGasPrice: '1', // 1 gwei, well below the 100 gwei previous fee
		});
		expect(model.selectedGasPrice?.maxFeePerGas).toBe(parseGwei('1'));
		expect(model.isSelectedPriceValid).toBe(false);
		expect(model.minPriceError).toMatch(/must be greater/);
	});

	it('returns null selection for an unparseable custom value', () => {
		const model = computeGasPricingModel({
			rawGasPrices: tiers(10n, 20n, 30n),
			selectedOption: 'custom',
			customGasPrice: 'not-a-number',
		});
		expect(model.selectedGasPrice).toBeNull();
		expect(model.isSelectedPriceValid).toBe(false);
	});

	it('defaults custom to fast, or to the minimum when nothing loaded', () => {
		const loaded = computeGasPricingModel({
			rawGasPrices: tiers(10n, 20n, parseGwei('3')),
			selectedOption: 'fast',
			customGasPrice: '',
		});
		expect(loaded.defaultCustomGasPrice).toBe('3');

		const unloaded = computeGasPricingModel({
			rawGasPrices: null,
			minGasPrice: gp(parseGwei('7')),
			selectedOption: 'custom',
			customGasPrice: '',
		});
		expect(unloaded.defaultCustomGasPrice).toBe('7');
	});
});
