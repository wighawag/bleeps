import {describe, it, expect} from 'vitest';
import {
	deriveMinGasPrice,
	deriveCancelGasPrice,
	toReplacementErrorMessage,
} from '../../../../src/lib/ui/pending-operation/operation-actions';
import {InsufficientFundsError} from '../../../../src/lib/core/transaction';
import type {OnchainOperation} from '../../../../src/lib/account/AccountData';

function operationWithGasParameters(gasParameters: unknown): OnchainOperation {
	return {
		metadata: {tx: {gasParameters}},
	} as unknown as OnchainOperation;
}

describe('deriveMinGasPrice', () => {
	it('returns undefined for a null operation', () => {
		expect(deriveMinGasPrice(null)).toBeUndefined();
	});

	it('reads EIP-1559 fields', () => {
		const op = operationWithGasParameters({
			maxFeePerGas: 100n,
			maxPriorityFeePerGas: 10n,
		});
		expect(deriveMinGasPrice(op)).toEqual({
			maxFeePerGas: 100n,
			maxPriorityFeePerGas: 10n,
		});
	});

	it('falls back to legacy gasPrice for both fields', () => {
		const op = operationWithGasParameters({gasPrice: 50n});
		expect(deriveMinGasPrice(op)).toEqual({
			maxFeePerGas: 50n,
			maxPriorityFeePerGas: 50n,
		});
	});

	it('returns undefined when no fee info is present', () => {
		expect(deriveMinGasPrice(operationWithGasParameters({}))).toBeUndefined();
	});
});

describe('deriveCancelGasPrice', () => {
	it('uses fast price when it exceeds the original', () => {
		expect(deriveCancelGasPrice({maxFeePerGas: 10n}, 100n)).toBe(100n);
	});

	it('bumps the original by 1 wei when it is at least the fast price', () => {
		expect(deriveCancelGasPrice({maxFeePerGas: 200n}, 100n)).toBe(201n);
	});

	it('handles missing gas parameters (treats original as 0)', () => {
		expect(deriveCancelGasPrice(undefined, 100n)).toBe(100n);
		expect(deriveCancelGasPrice(undefined, 0n)).toBe(1n);
	});

	it('falls back to legacy gasPrice', () => {
		expect(deriveCancelGasPrice({gasPrice: 300n}, 100n)).toBe(301n);
	});
});

describe('toReplacementErrorMessage', () => {
	it('returns null for an insufficient-funds dismissal', () => {
		expect(
			toReplacementErrorMessage(new InsufficientFundsError(0n, 1n), 'fallback'),
		).toBeNull();
	});

	it('maps user-rejection code 4001', () => {
		expect(toReplacementErrorMessage({code: 4001}, 'fallback')).toBe(
			'Transaction rejected by user',
		);
	});

	it('maps nonce conflicts from the message', () => {
		expect(
			toReplacementErrorMessage({message: 'nonce too low'}, 'fallback'),
		).toBe('Nonce conflict - transaction may have already been processed');
	});

	it('uses the error message, then the fallback', () => {
		expect(toReplacementErrorMessage({message: 'boom'}, 'fallback')).toBe(
			'boom',
		);
		expect(toReplacementErrorMessage({}, 'fallback')).toBe('fallback');
	});
});
