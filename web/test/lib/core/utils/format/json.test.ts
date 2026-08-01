import {describe, it, expect} from 'vitest';
import {bigIntReplacer, toPlainJson} from '$lib/core/utils/format/json';

describe('bigIntReplacer', () => {
	it('converts bigint values to decimal strings', () => {
		expect(bigIntReplacer('k', 10n)).toBe('10');
	});

	it('passes non-bigint values through unchanged', () => {
		expect(bigIntReplacer('k', 'hello')).toBe('hello');
		expect(bigIntReplacer('k', 42)).toBe(42);
		expect(bigIntReplacer('k', null)).toBe(null);
	});

	it('makes JSON.stringify work on objects containing bigints', () => {
		const json = JSON.stringify({amount: 1000n, name: 'x'}, bigIntReplacer);
		expect(json).toBe('{"amount":"1000","name":"x"}');
	});
});

describe('toPlainJson', () => {
	it('deep-clones while converting bigints to strings', () => {
		const input = {value: 42n, nested: {list: [1n, 2n], ok: true}};
		expect(toPlainJson(input)).toEqual({
			value: '42',
			nested: {list: ['1', '2'], ok: true},
		});
	});

	it('does not throw on values that plain JSON.stringify would reject', () => {
		// JSON.stringify([9007199254740993n]) throws by default.
		expect(() => toPlainJson([9007199254740993n])).not.toThrow();
		expect(toPlainJson([9007199254740993n])).toEqual(['9007199254740993']);
	});
});
