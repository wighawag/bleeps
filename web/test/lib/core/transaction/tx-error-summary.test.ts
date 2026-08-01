import {describe, it, expect} from 'vitest';
import {BaseError, ContractFunctionExecutionError} from 'viem';
import {
	txErrorSummary,
	txErrorDetails,
} from '../../../../src/lib/core/transaction/tx-error-summary';

describe('txErrorSummary', () => {
	it("uses viem BaseError's shortMessage", () => {
		const error = new BaseError('full long message', {
			metaMessages: ['extra'],
		});
		// BaseError's shortMessage defaults to the first argument
		expect(txErrorSummary(error)).toBe('full long message');
	});

	it('walks nested viem errors to the deepest shortMessage', () => {
		const inner = new BaseError('sender balance too low');
		const outer = new ContractFunctionExecutionError(inner, {
			abi: [
				{
					type: 'function',
					name: 'doIt',
					inputs: [],
					outputs: [],
					stateMutability: 'nonpayable',
				},
			],
			functionName: 'doIt',
		});
		expect(txErrorSummary(outer)).toBe('sender balance too low');
	});

	it('takes the first line of a plain Error message', () => {
		const error = new Error('first line\nsecond line\nthird line');
		expect(txErrorSummary(error)).toBe('first line');
	});

	it('falls back for non-Error values', () => {
		expect(txErrorSummary('boom')).toBe('Transaction failed');
		expect(txErrorSummary(undefined)).toBe('Transaction failed');
	});
});

describe('txErrorDetails', () => {
	it('returns the full message for Errors', () => {
		const error = new Error('line1\nline2');
		expect(txErrorDetails(error)).toBe('line1\nline2');
	});

	it('stringifies non-Error values', () => {
		expect(txErrorDetails('boom')).toBe('boom');
	});
});
