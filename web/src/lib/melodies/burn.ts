import {get} from 'svelte/store';
import {
	InsufficientFundsError,
	isUserRejectionError,
} from '$lib/core/transaction';
import {
	txErrorDetails,
	txErrorSummary,
} from '$lib/core/transaction/tx-error-summary';
import type {Context} from '$lib/context/types';
import {melodyToken} from './deployment';
import type {IndexedMelody} from './index';

/**
 * Burning melodies.
 *
 * MeloBleeps has no `burn` function: the contract's own note
 * `// TODO use uint256 data == 0 so we can burn Melodies ?` (on `_unsafe_mint`)
 * is still open, and `transferFrom` forbids the zero address, so there is no
 * native way to destroy a token. Until there is, a "burn" is a `transferFrom` to
 * a well-known dead address -- the token leaves the owner's balance and lands
 * somewhere nobody can recover from, which is the same effect a burn would
 * have, and it works against the deployed contract today without an upgrade.
 *
 * A burned melody is recognised by its owner being this dead address, which is
 * also how the melodies view filters them out (see {@link isBurned}).
 */

/** The address a burn sends to. Nobody holds the key, so the melody is gone. */
export const BURN_ADDRESS: `0x${string}` =
	'0x000000000000000000000000000000000000dEaD';

const BURN_ADDRESS_LOWER = BURN_ADDRESS.toLowerCase();

/** Whether a melody has been burned (its owner is the dead address). */
export function isBurned(owner: `0x${string}` | undefined): boolean {
	return !!owner && owner.toLowerCase() === BURN_ADDRESS_LOWER;
}

/** A copy of `melodies` with burned ones removed, for the melodies view. */
export function filterBurned(melodies: IndexedMelody[]): IndexedMelody[] {
	return melodies.filter((m) => !isBurned(m.owner));
}

export type BurnMelodyResult =
	| {status: 'submitted'}
	| {status: 'cancelled'}
	| {status: 'cannot-send'}
	| {status: 'error'; message: string; details: string};

export type BurnMelodyDeps = Pick<
	Context,
	'connection' | 'executor' | 'deployments' | 'balanceCheck'
>;

// TODO: replace this transfer-to-a-dead-address with a real burn once
// MeloBleeps grows a `burn` (or burnable) entry point. The contract's
// `_unsafe_mint` already notes the intention; until then `transferFrom` to
// BURN_ADDRESS is the closest equivalent that works against the deployed
// contract. A real burn should clear `_owners[id]` and emit `Transfer(to, 0)`,
// not just move ownership.
export async function burnMelody(
	deps: BurnMelodyDeps,
	id: string,
): Promise<BurnMelodyResult> {
	const {connection, executor, deployments, balanceCheck} = deps;

	try {
		await connection.ensureConnected();
		const $deployments = get(deployments);

		const $executor = get(executor);
		if ($executor.status === 'cannot-send') return {status: 'cannot-send'};
		if ($executor.status !== 'ready') return {status: 'cancelled'};

		const melobleeps = melodyToken($deployments);
		if (!melobleeps) {
			return {
				status: 'error',
				message: 'Melodies are not on this chain',
				details:
					'MeloBleeps is not part of this deployment, so there is nothing to burn with.',
			};
		}

		const contractRequest = await balanceCheck.ensureCanAfford({
			contract: {
				address: melobleeps.address,
				abi: melobleeps.abi,
				functionName: 'transferFrom',
				args: [$executor.address, BURN_ADDRESS, BigInt(id)],
				account: $executor.account,
			},
		});

		await $executor.client.writeContract(contractRequest);
		return {status: 'submitted'};
	} catch (error) {
		if (
			error instanceof InsufficientFundsError ||
			isUserRejectionError(error)
		) {
			return {status: 'cancelled'};
		}
		console.error('Failed to burn melody:', error);
		return {
			status: 'error',
			message: txErrorSummary(error),
			details: txErrorDetails(error),
		};
	}
}

/**
 * Whether the `?allow-burn` query param enables the burn UI.
 *
 * Mirrors the `?burner` resolution (see context/burner.ts): a bare `?allow-burn`
 * or any truthy value enables it; `?allow-burn=false|0|off|no` disables it.
 * Absent (the default) hides burning entirely.
 */
const FALSEY = new Set(['false', '0', 'off', 'no']);

export function allowBurnParam(value: string | null | undefined): boolean {
	if (value === null || value === undefined) return false;
	return !FALSEY.has(value.trim().toLowerCase());
}
