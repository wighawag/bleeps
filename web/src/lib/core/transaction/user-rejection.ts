import {UserRejectedRequestError} from 'viem';

/**
 * Checks if an error represents a user rejection (e.g., user declined the transaction in their wallet).
 *
 * This handles the standard EIP-1193 error code 4001 as well as viem's UserRejectedRequestError.
 * Works across different wallets (MetaMask, WalletConnect, Coinbase Wallet, etc.)
 *
 * @param error - The error to check
 * @returns true if the error indicates the user rejected the request
 */
export function isUserRejectionError(error: unknown): boolean {
	if (!error) return false;

	// Check for viem's UserRejectedRequestError
	if (error instanceof UserRejectedRequestError) {
		return true;
	}

	// Check for EIP-1193 standard error code 4001 (User Rejected Request)
	if (typeof error === 'object' && error !== null) {
		const err = error as Record<string, unknown>;

		// Direct code check
		if (err.code === 4001) {
			return true;
		}

		// Check nested cause (viem wraps errors)
		if (err.cause && typeof err.cause === 'object') {
			const cause = err.cause as Record<string, unknown>;
			if (cause.code === 4001) {
				return true;
			}
		}

		// Check for common rejection message patterns as fallback
		const message =
			typeof err.message === 'string' ? err.message.toLowerCase() : '';
		if (
			message.includes('user rejected') ||
			message.includes('user denied') ||
			message.includes('user cancelled') ||
			message.includes('user canceled') ||
			message.includes('rejected the request')
		) {
			return true;
		}
	}

	return false;
}
