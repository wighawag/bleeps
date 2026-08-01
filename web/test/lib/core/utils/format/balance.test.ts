import {describe, it, expect} from 'vitest';
import {formatBalance} from '$lib/core/utils/format/balance';

describe('formatBalance', () => {
	describe('basic formatting', () => {
		it('should format whole ETH amounts without decimals', () => {
			// 1 ETH = 10^18 wei
			expect(formatBalance(1_000_000_000_000_000_000n)).toBe('1');
			expect(formatBalance(100_000_000_000_000_000_000n)).toBe('100');
		});

		it('should format zero correctly', () => {
			expect(formatBalance(0n)).toBe('0');
		});

		it('should handle negative values', () => {
			expect(formatBalance(-1_000_000_000_000_000_000n)).toBe('-1');
		});
	});

	describe('decimal handling', () => {
		it('should show decimals for fractional amounts', () => {
			// 99.01 ETH
			expect(formatBalance(99_010_000_000_000_000_000n)).toBe('99.01');
		});

		it('should trim trailing zeros', () => {
			// 1.1 ETH
			expect(formatBalance(1_100_000_000_000_000_000n)).toBe('1.1');
		});

		it('should round up when appropriate (prefix with ~)', () => {
			// 9999.86988874541160716 ETH (9999.86... rounds up to 9999.87)
			expect(formatBalance(9_999_869_888_745_411_607_160n)).toBe('~9999.87');
		});

		it('should truncate down when appropriate (prefix with >)', () => {
			// 99.9991234 ETH truncated to 4 decimal places (maxSymbols=7: 2 for "99" + 1 for "." + 4 decimals)
			expect(formatBalance(99_999_123_400_000_000_000n)).toBe('>99.9991');
		});
	});

	describe('very small amounts', () => {
		it('should handle very small fractions', () => {
			// 0.001 ETH
			expect(formatBalance(1_000_000_000_000_000n)).toBe('0.001');
		});

		it('should show > prefix for amounts smaller than can be displayed', () => {
			// 0.0000001 ETH - too small to show in 7 symbols
			expect(formatBalance(100_000_000_000n)).toBe('>0');
		});
	});

	describe('very large amounts', () => {
		it('should format large whole numbers', () => {
			// 99999 ETH
			expect(formatBalance(99_999_000_000_000_000_000_000n)).toBe('99999');
		});

		it('should use > prefix when decimals cannot be shown for large numbers', () => {
			// Large number where decimals exceed maxSymbols
			// 999999.1 ETH - integer part uses 6 symbols + 1 for dot = 7
			const largeWithDecimal = 999_999_100_000_000_000_000_000n;
			expect(formatBalance(largeWithDecimal)).toBe('>999999');
		});
	});

	describe('custom decimals (USDC - 6 decimals)', () => {
		it('should handle USDC formatting', () => {
			// 9999.869888 USDC
			expect(formatBalance(9_999_869_888n, 6)).toBe('~9999.87');
		});

		it('should format whole USDC amounts', () => {
			// 100 USDC
			expect(formatBalance(100_000_000n, 6)).toBe('100');
		});
	});

	describe('custom maxSymbols', () => {
		it('should respect custom maxSymbols limit', () => {
			// 99.01 ETH with 5 max symbols
			expect(formatBalance(99_010_000_000_000_000_000n, 18, 5)).toBe('99.01');
		});

		it('should show more precision with higher maxSymbols', () => {
			// 1.123456 ETH with 10 max symbols
			expect(formatBalance(1_123_456_000_000_000_000n, 18, 10)).toBe(
				'1.123456',
			);
		});
	});

	describe('edge cases', () => {
		it('should handle 1 wei', () => {
			expect(formatBalance(1n)).toBe('>0');
		});

		it('should handle max safe integer', () => {
			// This should not throw
			const result = formatBalance(BigInt(Number.MAX_SAFE_INTEGER));
			expect(result).toBeDefined();
		});

		it('should handle very large bigints', () => {
			// Much larger than MAX_SAFE_INTEGER
			const veryLarge = 10n ** 30n;
			const result = formatBalance(veryLarge);
			expect(result).toBeDefined();
		});
	});

	describe('examples from documentation', () => {
		it('should match documented examples', () => {
			// From the JSDoc comments
			expect(formatBalance(9_999_869_888_745_411_607_160n)).toBe('~9999.87');
			expect(formatBalance(99_999_000_000_000_000_000_000n)).toBe('99999');
			expect(formatBalance(99_010_000_000_000_000_000n)).toBe('99.01');

			// USDC examples
			expect(formatBalance(9_999_869_888n, 6)).toBe('~9999.87');
		});
	});
});
