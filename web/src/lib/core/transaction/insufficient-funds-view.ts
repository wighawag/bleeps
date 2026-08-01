import type {BalanceCheckState} from './balance-check-store';
import type {BalanceStore} from '$lib/core/connection/balance';

export type InsufficientFundsView = {
	/** The balance store to display (only present in the insufficient step). */
	balanceStore: BalanceStore | null;
	/** Live balance, defaulting to 0 while unloaded. */
	displayBalance: bigint;
	/** True once the (possibly updated) balance covers the estimated cost. */
	hasSufficientFunds: boolean;
	/** Missing amount, clamped to 0 when funds are sufficient. */
	shortfall: bigint;
	/** True while polling for a balance change after a faucet claim. */
	isWaitingForBalanceUpdate: boolean;
};

type LoadedBalance = {step: 'Loaded'; value: bigint};

/**
 * Derive the display view-model for the insufficient-funds modal from the
 * balance-check state and the current value of its balance store.
 *
 * Pure: the `.svelte` file subscribes to the stores and passes their snapshots
 * here, keeping the balance math out of the component.
 */
export function deriveInsufficientFundsView(
	state: BalanceCheckState,
	currentBalance: {step: string; value?: bigint} | null,
): InsufficientFundsView {
	if (state.step !== 'insufficient') {
		return {
			balanceStore: null,
			displayBalance: 0n,
			hasSufficientFunds: false,
			shortfall: 0n,
			isWaitingForBalanceUpdate: false,
		};
	}

	const loaded =
		currentBalance && currentBalance.step === 'Loaded'
			? (currentBalance as LoadedBalance)
			: null;
	const displayBalance = loaded ? loaded.value : 0n;
	const hasSufficientFunds = loaded
		? loaded.value >= state.estimatedCost
		: false;
	const shortfall =
		state.estimatedCost > displayBalance
			? state.estimatedCost - displayBalance
			: 0n;

	return {
		balanceStore: state.balanceStore,
		displayBalance,
		hasSufficientFunds,
		shortfall,
		isWaitingForBalanceUpdate: state.isWaitingForBalanceUpdate === true,
	};
}
