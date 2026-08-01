import {describe, it, expect} from 'vitest';
import {
	classifyAddressInput,
	isENSName,
	isValidHexAddress,
	isPartialHexAddress,
} from '../../../../../src/lib/core/ui/ethereum/address-input';

const FULL = '0x1234567890abcdef1234567890abcdef12345678';

describe('isENSName', () => {
	it('accepts known TLDs, ignoring case/whitespace', () => {
		expect(isENSName('vitalik.eth')).toBe(true);
		expect(isENSName('  Foo.XYZ ')).toBe(true);
	});
	it('rejects non-ENS input', () => {
		expect(isENSName('vitalik')).toBe(false);
		expect(isENSName(FULL)).toBe(false);
	});
});

describe('isValidHexAddress', () => {
	it('accepts a full 40-hex-char address', () => {
		expect(isValidHexAddress(FULL)).toBe(true);
	});
	it('rejects short/long/non-hex', () => {
		expect(isValidHexAddress('0x1234')).toBe(false);
		expect(isValidHexAddress(FULL + 'ab')).toBe(false);
		expect(isValidHexAddress('0xZZZ')).toBe(false);
	});
});

describe('isPartialHexAddress', () => {
	it('accepts a prefix while typing', () => {
		expect(isPartialHexAddress('0x')).toBe(true);
		expect(isPartialHexAddress('0x1234')).toBe(true);
		expect(isPartialHexAddress(FULL)).toBe(true);
	});
	it('rejects overly long or non-hex', () => {
		expect(isPartialHexAddress(FULL + 'a')).toBe(false);
		expect(isPartialHexAddress('0xZ')).toBe(false);
	});
});

describe('classifyAddressInput', () => {
	it('classifies empty input', () => {
		expect(classifyAddressInput('   ')).toEqual({kind: 'empty'});
	});

	it('lowercases and returns a full address', () => {
		expect(classifyAddressInput(FULL.toUpperCase())).toEqual({
			kind: 'address',
			address: FULL,
		});
	});

	it('flags a partial hex address', () => {
		expect(classifyAddressInput('0x1234')).toEqual({kind: 'partial'});
	});

	it('detects an ENS name (trimmed)', () => {
		expect(classifyAddressInput('  vitalik.eth ')).toEqual({
			kind: 'ens',
			name: 'vitalik.eth',
		});
	});

	it('marks anything else invalid', () => {
		expect(classifyAddressInput('hello world')).toEqual({kind: 'invalid'});
	});
});
