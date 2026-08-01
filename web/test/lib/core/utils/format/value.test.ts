import {describe, it, expect} from 'vitest';
import {
	formatGas,
	formatGasPrice,
	formatValue,
} from '$lib/core/utils/format/value';

describe('formatGas', () => {
	it('formats gas units with locale separators', () => {
		// toLocaleString default locale in CI is en-US.
		expect(formatGas(21000n)).toBe((21000).toLocaleString());
		expect(formatGas(0n)).toBe('0');
	});
});

describe('formatGasPrice', () => {
	it('formats wei as Gwei with a unit suffix', () => {
		expect(formatGasPrice(1_000_000_000n)).toBe('1 Gwei');
		expect(formatGasPrice(1_500_000_000n)).toBe('1.5 Gwei');
	});
});

describe('formatValue', () => {
	it('formats wei as ETH with a unit suffix', () => {
		expect(formatValue(1_000_000_000_000_000_000n)).toBe('1 ETH');
		expect(formatValue(0n)).toBe('0 ETH');
	});
});
