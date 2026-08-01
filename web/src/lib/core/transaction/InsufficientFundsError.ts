export class InsufficientFundsError extends Error {
	readonly code = 'INSUFFICIENT_FUNDS' as const;
	readonly balance: bigint;
	readonly estimatedCost: bigint;
	readonly shortfall: bigint;

	constructor(balance: bigint, estimatedCost: bigint) {
		const shortfall = estimatedCost - balance;
		super(`Insufficient funds: need ${shortfall} more wei`);
		this.name = 'InsufficientFundsError';
		this.balance = balance;
		this.estimatedCost = estimatedCost;
		this.shortfall = shortfall;
	}
}
