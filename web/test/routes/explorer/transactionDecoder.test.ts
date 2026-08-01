import {describe, it, expect} from 'vitest';
import {encodeAbiParameters, toHex} from 'viem';
import {
	parseStandardRevertReason,
	parsePanicError,
	formatDecodedError,
	formatDecodedArgs,
	formatArgValue,
	formatDecodedTransaction,
	type DecodedTransactionData,
} from '../../../src/routes/explorer/lib/services/transactionDecoder';

/**
 * Build the ABI-encoded calldata for a standard `Error(string)` revert:
 * selector 0x08c379a0 followed by the ABI-encoded string.
 */
function encodeStandardRevert(reason: string): `0x${string}` {
	const encoded = encodeAbiParameters([{type: 'string'}], [reason]);
	return ('0x08c379a0' + encoded.slice(2)) as `0x${string}`;
}

/**
 * Build the ABI-encoded calldata for a `Panic(uint256)` revert:
 * selector 0x4e487b71 followed by a 32-byte code.
 */
function encodePanic(code: number): `0x${string}` {
	const codeHex = toHex(code, {size: 32});
	return ('0x4e487b71' + codeHex.slice(2)) as `0x${string}`;
}

describe('parseStandardRevertReason', () => {
	it('decodes a standard Error(string) revert', () => {
		expect(parseStandardRevertReason(encodeStandardRevert('boom'))).toBe(
			'boom',
		);
	});

	it('round-trips a longer, spaced message', () => {
		const msg = 'insufficient balance for transfer';
		expect(parseStandardRevertReason(encodeStandardRevert(msg))).toBe(msg);
	});

	it('round-trips a non-ASCII (multi-byte UTF-8) message', () => {
		const msg = 'non-ASCII: café ✓ 日本語';
		expect(parseStandardRevertReason(encodeStandardRevert(msg))).toBe(msg);
	});

	it('returns null when the data is not an Error(string) selector', () => {
		expect(parseStandardRevertReason('0xdeadbeef')).toBeNull();
	});

	it('returns an empty string for an empty revert reason', () => {
		expect(parseStandardRevertReason(encodeStandardRevert(''))).toBe('');
	});
});

describe('parsePanicError', () => {
	it('maps a known panic code to its message', () => {
		const decoded = parsePanicError(encodePanic(0x11));
		expect(decoded).not.toBeNull();
		expect(decoded!.errorName).toBe('Panic');
		expect(decoded!.args).toEqual({
			code: 0x11,
			message: 'Arithmetic overflow/underflow',
		});
	});

	it('maps assertion failed (0x01)', () => {
		const decoded = parsePanicError(encodePanic(0x01));
		expect((decoded!.args as {message: string}).message).toBe(
			'Assertion failed',
		);
	});

	it('labels unknown panic codes without throwing', () => {
		const decoded = parsePanicError(encodePanic(0x99));
		expect((decoded!.args as {message: string}).message).toBe(
			'Unknown panic code: 153',
		);
	});

	it('returns null when the data is not a Panic selector', () => {
		expect(parsePanicError('0x08c379a0')).toBeNull();
	});
});

describe('formatArgValue', () => {
	it('renders null and undefined literally', () => {
		expect(formatArgValue(null)).toBe('null');
		expect(formatArgValue(undefined)).toBe('undefined');
	});

	it('truncates addresses to head and tail', () => {
		expect(formatArgValue('0x1234567890abcdef1234567890abcdef12345678')).toBe(
			'0x1234...5678',
		);
	});

	it('truncates 32-byte hashes to a short head', () => {
		const hash =
			'0xabcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789';
		expect(formatArgValue(hash)).toBe('0xabcdef...');
	});

	it('quotes short strings and truncates long ones', () => {
		expect(formatArgValue('hi')).toBe('"hi"');
		const long = 'x'.repeat(60);
		expect(formatArgValue(long)).toBe(`"${'x'.repeat(30)}..."`);
	});

	it('suffixes bigints with n', () => {
		expect(formatArgValue(42n)).toBe('42n');
	});

	it('renders booleans and numbers via String()', () => {
		expect(formatArgValue(true)).toBe('true');
		expect(formatArgValue(7)).toBe('7');
	});

	it('JSON-stringifies plain objects', () => {
		expect(formatArgValue({a: 1})).toBe('{"a":1}');
	});
});

describe('formatDecodedArgs', () => {
	it('formats positional (array) args', () => {
		expect(formatDecodedArgs([1n, 'hi'])).toBe('(1n, "hi")');
	});

	it('formats an empty array as ()', () => {
		expect(formatDecodedArgs([])).toBe('()');
	});

	it('formats named (object) args', () => {
		expect(formatDecodedArgs({amount: 5n, note: 'ok'})).toBe(
			'(amount: 5n, note: "ok")',
		);
	});

	it('formats an empty object as ()', () => {
		expect(formatDecodedArgs({})).toBe('()');
	});
});

describe('formatDecodedError', () => {
	it('returns just the name when there are no args', () => {
		expect(formatDecodedError({errorName: 'Unauthorized'})).toBe(
			'Unauthorized',
		);
	});

	it('renders positional args', () => {
		expect(formatDecodedError({errorName: 'BadAmount', args: [1n, 2n]})).toBe(
			'BadAmount(1n, 2n)',
		);
	});

	it('renders named args', () => {
		expect(
			formatDecodedError({errorName: 'BadAmount', args: {min: 1n, got: 0n}}),
		).toBe('BadAmount(min: 1n, got: 0n)');
	});

	it('collapses an empty-args object to just the name', () => {
		expect(formatDecodedError({errorName: 'Empty', args: {}})).toBe('Empty');
	});
});

describe('formatDecodedTransaction', () => {
	it('labels a decoded call with contract and function name', () => {
		const data: DecodedTransactionData = {
			isDecoded: true,
			status: 'success',
			functionName: 'transfer',
			contractName: 'Token',
			args: {to: '0xabc', amount: 1n},
		};
		const out = formatDecodedTransaction(data);
		expect(out.methodLabel).toBe('Token.transfer');
		expect(out.methodDetails).toBe('(to: "0xabc", amount: 1n)');
		expect(out.statusText).toBe('Success');
	});

	it('uses just the function name when contract name is absent', () => {
		const out = formatDecodedTransaction({
			isDecoded: true,
			status: 'pending',
			functionName: 'mint',
		});
		expect(out.methodLabel).toBe('mint');
		expect(out.statusText).toBe('Pending');
	});

	it('labels a plain transfer when there is no function name', () => {
		const out = formatDecodedTransaction({
			isDecoded: false,
			status: 'success',
		});
		expect(out.methodLabel).toBe('Transfer');
	});

	it('labels contract creation', () => {
		const out = formatDecodedTransaction({
			isDecoded: false,
			status: 'failed',
			functionName: 'Contract Creation',
		});
		expect(out.methodLabel).toBe('Contract Creation');
		expect(out.statusText).toBe('Failed');
	});
});
