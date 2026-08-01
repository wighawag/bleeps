import {describe, it, expect} from 'vitest';
import {
	buildFaucetClaimUrl,
	isValidTxHash,
} from '../../../../../src/lib/core/ui/faucet/faucet-actions';

describe('buildFaucetClaimUrl', () => {
	it('appends /api/claim without a trailing slash', () => {
		expect(buildFaucetClaimUrl('https://faucet.example')).toBe(
			'https://faucet.example/api/claim',
		);
	});

	it('tolerates a trailing slash on the base', () => {
		expect(buildFaucetClaimUrl('https://faucet.example/')).toBe(
			'https://faucet.example/api/claim',
		);
	});
});

describe('isValidTxHash', () => {
	it('accepts a 0x-prefixed string', () => {
		expect(isValidTxHash('0xabc')).toBe(true);
	});

	it('rejects non-strings and non-hex', () => {
		expect(isValidTxHash(undefined)).toBe(false);
		expect(isValidTxHash(null)).toBe(false);
		expect(isValidTxHash(123)).toBe(false);
		expect(isValidTxHash('abc')).toBe(false);
	});
});
