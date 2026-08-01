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
import {
	encodeMelodyToChainData,
	melodyNameProblem,
	type MelodyInfo,
} from '$lib/melodies/melody';

export type MintMelodyResult =
	| {status: 'submitted'}
	| {status: 'cancelled'}
	| {status: 'cannot-send'}
	| {status: 'error'; message: string; details: string};

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
			message: 'That name cannot be minted',
			details: nameProblem,
		};
	}

	// A melody with nothing audible in it would mint a silent token, and the name
	// it claims is then taken for good (`NAME_ALREADY_TAKEN` is permanent).
	if (!melody.slots.some((slot) => slot.volume > 0)) {
		return {
			status: 'error',
			message: 'This melody is silent',
			details: 'Give at least one slot a volume above zero before minting.',
		};
	}

	try {
		await connection.ensureConnected();
		const $deployments = get(deployments);

		const $executor = get(executor);
		if ($executor.status === 'cannot-send') return {status: 'cannot-send'};
		if ($executor.status !== 'ready') return {status: 'cancelled'};

		const {data1, data2} = encodeMelodyToChainData(melody);

		const contractRequest = await balanceCheck.ensureCanAfford({
			contract: {
				address: $deployments.contracts.MeloBleeps.address,
				abi: $deployments.contracts.MeloBleeps.abi,
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
			message: txErrorSummary(error),
			details: txErrorDetails(error),
		};
	}
}
