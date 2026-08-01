import {BaseError} from 'viem';

/**
 * Produce a short, human-friendly summary of a transaction error.
 *
 * viem errors carry a full multi-line dump (request args, docs link, version)
 * that is useful for debugging but overwhelming in a toast. viem's `BaseError`
 * exposes `shortMessage` (a single-sentence cause); prefer that. Fall back to
 * the first line of a generic error message, then a generic string.
 *
 * The full text remains available via {@link txErrorDetails} for a
 * details/expand affordance.
 */
export function txErrorSummary(error: unknown): string {
	if (error instanceof BaseError) {
		// walk to the deepest shortMessage (most specific cause)
		const short = error.walk(
			(e) => e instanceof BaseError && !!e.shortMessage,
		) as BaseError | null;
		if (short?.shortMessage) return short.shortMessage;
		if (error.shortMessage) return error.shortMessage;
	}
	if (error instanceof Error && error.message) {
		return error.message.split('\n')[0].trim();
	}
	return 'Transaction failed';
}

/** The full error text, for a "show details" affordance. */
export function txErrorDetails(error: unknown): string {
	if (error instanceof Error) return error.message;
	return String(error);
}
