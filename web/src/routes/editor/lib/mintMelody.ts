import {get} from 'svelte/store';
import {
	InsufficientFundsError,
	isUserRejectionError,
} from '$lib/core/transaction';
import {txErrorDetails} from '$lib/core/transaction/tx-error-summary';
import type {Context} from '$lib/context/types';
import {
	encodeMelodyToChainData,
	melodyNameProblem,
	type MelodyInfo,
} from '$lib/melodies/melody';
import {melodyToken} from '$lib/melodies/deployment';
import {mintProblemFromError, type MintProblem} from './mint-problem';

export type MintMelodyResult =
	| {status: 'submitted'}
	| {status: 'cancelled'}
	| {status: 'cannot-send'}
	/**
	 * A failure, already interpreted. `message`/`explanation`/`code` come from
	 * `mint-problem.ts` so the dialog can say something useful (and offer a rename
	 * when the name is what was refused); `details` stays the raw error text for
	 * the details modal.
	 */
	| ({status: 'error'; details: string} & MintProblem);

export type MintMelodyDeps = Pick<
	Context,
	'connection' | 'executor' | 'deployments' | 'balanceCheck'
>;

/**
 * Mint a melody in one transaction, as the pre-template app did.
 *
 * `MeloBleeps.reserveAndMint` reserves, reveals and mints together. It takes no
 * payment, has no minter check, and makes the sender the artist, which is why the
 * contract marks it `// TODO REMOVE:`. That is the behaviour being reproduced
 * here on purpose: melody sales do not exist yet (they are to be creator-driven,
 * later), and the two-phase reserve/reveal that would let a composition be
 * committed without revealing it is not reachable on the deployed contract at
 * all, since `reserve` is `internal`. See the MeloBleeps tests.
 *
 * Note the argument order: name, SPEED, data1, data2, to. It differs from every
 * other entry point on the contract, where speed comes last.
 */
export async function mintMelody(
	deps: MintMelodyDeps,
	melody: MelodyInfo,
): Promise<MintMelodyResult> {
	const {connection, executor, deployments, balanceCheck} = deps;

	const name = melody.name.trim();

	const nameProblem = melodyNameProblem(name);
	if (nameProblem) {
		return {
			status: 'error',
			code: 'invalid-name',
			message: 'That name cannot be minted',
			explanation: nameProblem,
			details: nameProblem,
		};
	}

	// A melody with nothing audible in it would mint a silent token, and the name
	// it claims is then taken for good (`NAME_ALREADY_TAKEN` is permanent).
	if (!melody.slots.some((slot) => slot.volume > 0)) {
		const explanation =
			'Give at least one slot a volume above zero before minting. A silent melody would still claim its name for good.';
		return {
			status: 'error',
			code: 'silent',
			message: 'This melody is silent',
			explanation,
			details: explanation,
		};
	}

	try {
		await connection.ensureConnected();
		const $deployments = get(deployments);

		const $executor = get(executor);
		if ($executor.status === 'cannot-send') return {status: 'cannot-send'};
		if ($executor.status !== 'ready') return {status: 'cancelled'};

		const melobleeps = melodyToken($deployments);
		if (!melobleeps) {
			// Nothing should reach this: the editor is not built where MeloBleeps is
			// not deployed. Said out loud rather than thrown as `undefined.address`.
			const explanation =
				'MeloBleeps is not part of this deployment, so there is nothing to mint with.';
			return {
				status: 'error',
				code: 'not-deployed',
				message: 'Melodies are not on this chain',
				explanation,
				details: explanation,
			};
		}

		const {data1, data2} = encodeMelodyToChainData(melody);

		const contractRequest = await balanceCheck.ensureCanAfford({
			contract: {
				address: melobleeps.address,
				abi: melobleeps.abi,
				functionName: 'reserveAndMint',
				// `address` is the sender as a plain address; `account` may be a viem
				// Account object, which is not what an `address` argument accepts.
				args: [name, melody.speed, data1, data2, $executor.address],
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
			// User dismissed the funds modal or rejected in their wallet.
			return {status: 'cancelled'};
		}
		console.error('Failed to mint melody:', error);
		return {
			status: 'error',
			...mintProblemFromError(error, name),
			details: txErrorDetails(error),
		};
	}
}
