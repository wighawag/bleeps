import {derived, type Readable} from 'svelte/store';
import type {BleepsState, OnchainStateStore} from '$lib/onchain/state';
import type {Schema} from '$lib/account/AccountData';
import type {FieldReadable} from 'synqable';

/**
 * The Bleeps world as the user should see it right now.
 *
 * The last confirmed chain read, plus the melodies this user has in flight.
 *
 * Without the overlay a mint looks inert: `onchainState` polls every 5s, so a
 * melody the user just paid for does not appear for up to five seconds, which
 * reads as a failure and invites a second attempt.
 */
export type BleepsView = BleepsState & {
	/** How many of the 576 have an owner. */
	minted: number;
	/** Melodies this user has submitted that the chain has not confirmed yet. */
	pendingMelodies: PendingMelody[];
};

export type PendingMelody = {
	operationID: string;
	name: string;
};

/**
 * Inclusion states that mean the transaction will never land, so its operation
 * must stop counting as pending.
 */
const DEAD_INCLUSIONS = ['NotFound', 'Dropped'];

/**
 * Whether an operation is still awaiting inclusion, i.e. its effect is NOT yet
 * visible in the chain read.
 *
 * Anything already included is excluded, successful or not: the chain read is
 * the source of truth once a transaction is in a block, and counting an included
 * mint again would show the melody twice. The tx-observer refreshes onchain state
 * on inclusion, so the handover is immediate.
 */
function isInFlight(operation: {
	transactionIntent: {state?: {status?: string; inclusion?: string}};
}): boolean {
	const state = operation.transactionIntent.state;
	if (!state) {
		// submitted, nothing known about it yet
		return true;
	}
	if (state.status === 'Failure') {
		return false;
	}
	if (state.inclusion && DEAD_INCLUSIONS.includes(state.inclusion)) {
		return false;
	}
	return state.inclusion !== 'Included';
}

/** The melodies this user has submitted and the chain has not caught up with. */
export function pendingMelodiesFrom(
	operations: Record<string, any> | undefined,
): PendingMelody[] {
	const pending: PendingMelody[] = [];
	for (const operationID of Object.keys(operations ?? {})) {
		const operation = operations![operationID];
		if (
			operation.metadata?.type === 'functionCall' &&
			operation.metadata.functionName === 'reserveAndMint' &&
			isInFlight(operation)
		) {
			pending.push({
				operationID,
				// args are [name, speed, data1, data2, to]
				name: String(operation.metadata.args?.[0] ?? 'untitled'),
			});
		}
	}
	return pending;
}

export type ViewStateValue =
	{step: 'Unloaded'} | {step: 'Loaded'; bleeps: BleepsView};

export type ViewStateStatus = {
	loading: boolean;
	error?: {message: string};
	lastSuccessfulFetch?: number;
};

export type ViewStateStore = {
	subscribe: Readable<ViewStateValue>['subscribe'];
	status: Readable<ViewStateStatus>;
};

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';

export function createViewState(params: {
	onchainState: OnchainStateStore;
	operations: FieldReadable<Schema, 'operations'>;
}): ViewStateStore {
	const {onchainState, operations} = params;

	const store: Readable<ViewStateValue> = derived(
		[onchainState, operations],
		([$onchainState, $operations]): ViewStateValue => {
			if ($onchainState.step === 'Unloaded') {
				return {step: 'Unloaded'};
			}
			const {owners, treasury} = $onchainState;
			return {
				step: 'Loaded',
				bleeps: {
					owners,
					treasury,
					minted: owners.filter(
						(owner: string) => owner.toLowerCase() !== ZERO_ADDRESS,
					).length,
					pendingMelodies: pendingMelodiesFrom(
						$operations as unknown as Record<string, any>,
					),
				},
			};
		},
	);

	return {subscribe: store.subscribe, status: onchainState.status};
}
