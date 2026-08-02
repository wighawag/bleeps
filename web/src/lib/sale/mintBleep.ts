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
import type {SaleDeployment} from '$lib/sale/deployment';
import {
	bookingSignature,
	isUsablePass,
	passProof,
	salePassSignature,
	type SalePass,
} from '$lib/sale/passes';
import {
	BookingRefusedError,
	type BookingClient,
	type BookingSubmission,
} from '$lib/sale/booking';

export type MintBleepResult =
	| {status: 'submitted'}
	| {status: 'cancelled'}
	| {status: 'cannot-send'}
	| {status: 'error'; message: string; details: string};

export type MintBleepDeps = Pick<
	Context,
	'connection' | 'executor' | 'balanceCheck'
>;

export type MintBleepParams = {
	id: number;
	sale: SaleDeployment;
	/** What this visitor can present, from `resolveSalePass`. */
	pass: SalePass;
	/** Whether the chain says the pass requirement has lapsed. */
	publicPhase: boolean;
	/** What the contract will charge, read from the chain rather than assumed. */
	price: bigint;
	/** Absent when no booking service is configured; minting still works. */
	booking?: BookingClient;
};

/**
 * Buy one Bleep, the way the 2021 sale did.
 *
 * Three entry points, and which one applies is not a preference:
 *
 *   public phase       `mint`, no pass involved
 *   address-bound pass `mintWithPassId`, proving (passId, msg.sender)
 *   transferable pass  `mintWithSalePass`, proving (passId, key) over a
 *                      signature of (passId, recipient)
 *
 * The booking service is asked first and told again once there is a transaction
 * hash. It is advisory: a refusal means somebody else is already paying for this
 * Bleep and stops the mint, but a service that cannot be reached does not, since
 * nothing on chain consults it. See lib/sale/booking.ts.
 */
export async function mintBleep(
	deps: MintBleepDeps,
	params: MintBleepParams,
): Promise<MintBleepResult> {
	const {connection, executor, balanceCheck} = deps;
	const {id, sale, pass, publicPhase, price, booking} = params;

	if (!publicPhase && !isUsablePass(pass)) {
		return {
			status: 'error',
			message: 'This Bleep needs a pass',
			details:
				pass.kind === 'invalid'
					? pass.message
					: 'The sale is still in its pass-gated phase. Wait for the public phase, or use a pass link.',
		};
	}

	try {
		await connection.ensureConnected();

		const $executor = get(executor);
		if ($executor.status === 'cannot-send') return {status: 'cannot-send'};
		if ($executor.status !== 'ready') return {status: 'cancelled'};
		const to = $executor.address;

		// Only present a pass while one is required. After the whitelist ends the
		// contract ignores it, and spending it would waste it.
		const usePass = !publicPhase && isUsablePass(pass) ? pass : undefined;

		const submission: BookingSubmission = {
			address: to,
			bleep: id,
			pass: usePass
				? {
						id: usePass.passId,
						to,
						signature: await bookingSignature(usePass, id),
					}
				: undefined,
		};

		if (booking) {
			try {
				await booking.book(submission);
			} catch (error) {
				if (error instanceof BookingRefusedError) {
					// The service's own words: it refuses for several different reasons
					// (already booked, already being bought, too many at once) and only
					// it knows which.
					return {
						status: 'error',
						message: 'Cannot book that Bleep',
						details: error.message,
					};
				}
				// Unreachable service: advisory only, so carry on.
				console.error('booking service unreachable', error);
			}
		}

		const call = usePass
			? usePass.kind === 'address-bound'
				? {
						functionName: 'mintWithPassId' as const,
						args: [
							id,
							to,
							BigInt(usePass.passId),
							passProof(sale.linkedData.leaves, usePass),
						],
					}
				: {
						functionName: 'mintWithSalePass' as const,
						args: [
							id,
							to,
							BigInt(usePass.passId),
							await salePassSignature(usePass, to),
							passProof(sale.linkedData.leaves, usePass),
						],
					}
			: {functionName: 'mint' as const, args: [id, to]};

		const contractRequest = await balanceCheck.ensureCanAfford({
			contract: {
				address: sale.address,
				abi: sale.abi,
				functionName: call.functionName,
				args: call.args,
				account: $executor.account,
				value: price,
			},
		});

		const hash = await $executor.client.writeContract(contractRequest);

		if (booking) {
			// Now that there is a transaction, the service holds the booking until
			// it lands rather than for ten seconds.
			await booking
				.book({...submission, transactionHash: hash})
				.catch((error) => console.error('booking service unreachable', error));
		}

		return {status: 'submitted'};
	} catch (error) {
		if (
			error instanceof InsufficientFundsError ||
			isUserRejectionError(error)
		) {
			return {status: 'cancelled'};
		}
		console.error('Failed to mint a Bleep:', error);
		return {
			status: 'error',
			message: txErrorSummary(error),
			details: txErrorDetails(error),
		};
	}
}
