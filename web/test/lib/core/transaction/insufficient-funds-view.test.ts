import {describe, it, expect} from 'vitest';
import {deriveInsufficientFundsView} from '../../../../src/lib/core/transaction/insufficient-funds-view';
import type {BalanceCheckState} from '../../../../src/lib/core/transaction/balance-check-store';

function insufficientState(
	overrides: Partial<Extract<BalanceCheckState, {step: 'insufficient'}>> = {},
): BalanceCheckState {
	return {
		step: 'insufficient',
		balanceStore: {} as any,
		estimatedCost: 1000n,
		onContinue: () => {},
		onDismiss: () => {},
		isWaitingForBalanceUpdate: false,
		...overrides,
	};
}

describe('deriveInsufficientFundsView', () => {
	it('returns a neutral view for non-insufficient steps', () => {
		const view = deriveInsufficientFundsView({step: 'idle'}, null);
		expect(view).toEqual({
			balanceStore: null,
			displayBalance: 0n,
			hasSufficientFunds: false,
			shortfall: 0n,
			isWaitingForBalanceUpdate: false,
		});
	});

	it('computes a shortfall when the balance is below the cost', () => {
		const view = deriveInsufficientFundsView(insufficientState(), {
			step: 'Loaded',
			value: 400n,
		});
		expect(view.displayBalance).toBe(400n);
		expect(view.hasSufficientFunds).toBe(false);
		expect(view.shortfall).toBe(600n);
	});

	it('reports sufficient funds and no shortfall once covered', () => {
		const view = deriveInsufficientFundsView(insufficientState(), {
			step: 'Loaded',
			value: 1000n,
		});
		expect(view.hasSufficientFunds).toBe(true);
		expect(view.shortfall).toBe(0n);
	});

	it('treats an unloaded balance as zero', () => {
		const view = deriveInsufficientFundsView(insufficientState(), {
			step: 'Loading',
		});
		expect(view.displayBalance).toBe(0n);
		expect(view.hasSufficientFunds).toBe(false);
		expect(view.shortfall).toBe(1000n);
	});

	it('surfaces the waiting-for-balance flag', () => {
		const view = deriveInsufficientFundsView(
			insufficientState({isWaitingForBalanceUpdate: true}),
			null,
		);
		expect(view.isWaitingForBalanceUpdate).toBe(true);
	});
});
