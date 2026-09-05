import {derived, type Readable} from 'svelte/store';
import type {BleepsState, OnchainStateStore} from '$lib/onchain/state';
import type {Schema} from '$lib/account/AccountData';
import type {FieldReadable} from 'synqable';
import type {IndexedMelody} from '$lib/melodies/index/types';
import {bleepsMode, type BleepsMode} from '$lib/sale/mode';

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
	/**
	 * Bleeps this user is buying that the chain has not confirmed yet. Their
	 * owner is already written into `owners`, so the rest of the app does not
	 * have to know about them; this is for drawing them as unsettled.
	 */
	pendingBleeps: PendingBleep[];
	/** Melodies this user has submitted that the chain has not confirmed yet. */
	pendingMelodies: PendingMelody[];
	/**
	 * Whether there is a sale to run, worked out from the chain rather than
	 * configured. See lib/sale/mode.ts.
	 */
	mode: BleepsMode;
};

export type PendingMelody = {
	operationID: string;
	name: string;
};

export type PendingBleep = {
	operationID: string;
	/** Token id. */
	id: number;
	/** Who it is being bought for. */
	to: `0x${string}`;
};

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';

/**
 * Inclusion states that mean the transaction will never land, so its operation
 * must stop counting as pending.
 */
const DEAD_INCLUSIONS = ['NotFound', 'Dropped'];

/** The shape of an operation this module reads. Deliberately loose: it is fed
 * from the account-data store, whose entries are only partly populated while a
 * transaction is being broadcast. */
type OperationLike = {
	metadata?: {
		type?: string;
		functionName?: string;
		args?: unknown[];
	};
	/**
	 * The dispatch facts, one entry per broadcast. `nonce` and the broadcast
	 * time are PER ATTEMPT: a replacement is a second attempt at the same slot,
	 * and the record no longer keeps a single copy of either.
	 */
	attempts?: {nonce?: number; broadcastTimestampMs?: number}[];
	/** Observer-owned, and no longer nested under a stored intent. */
	state?: {outcome?: string; inclusion?: string};
};

type OperationEntry = {operationID: string; operation: OperationLike};

/**
 * Whether an operation is still awaiting inclusion, i.e. its effect is NOT yet
 * visible in the chain read.
 *
 * Anything already included is excluded, successful or not: the chain read is
 * the source of truth once a transaction is in a block, and counting an included
 * mint again would show the melody twice. The tx-observer refreshes onchain state
 * on inclusion, so the handover is immediate.
 */
function isInFlight(operation: OperationLike): boolean {
	const state = operation.state;
	if (!state) {
		// submitted, nothing known about it yet
		return true;
	}
	if (state.outcome === 'Failure') {
		return false;
	}
	if (state.inclusion && DEAD_INCLUSIONS.includes(state.inclusion)) {
		return false;
	}
	return state.inclusion !== 'Included';
}

/**
 * The in-flight operations calling one of `functionNames`.
 *
 * Same filter as jolly-roger's view: the right kind of call, no failures, and
 * nothing whose inclusion says it will never land.
 */
export function inFlightOperations(
	operations: Record<string, OperationLike> | undefined,
	functionNames: string[],
): OperationEntry[] {
	const entries: OperationEntry[] = [];
	for (const operationID of Object.keys(operations ?? {})) {
		const operation = operations![operationID];
		if (
			operation.metadata?.type === 'functionCall' &&
			functionNames.includes(operation.metadata.functionName ?? '') &&
			isInFlight(operation)
		) {
			entries.push({operationID, operation});
		}
	}
	return entries;
}

/**
 * Whether `current` supersedes `existing`, for two operations competing over the
 * same thing.
 *
 * Comparison order, most significant first:
 *
 *   1. higher nonce wins: it is the later transaction
 *   2. same nonce, higher broadcast timestamp wins: it is the later attempt at
 *      that nonce, and only one of them can ever be mined
 *   3. same nonce and timestamp, lexicographically greater operationID wins
 *
 * The last rule is not a preference, it is what makes the result independent of
 * the order the operations happen to be iterated in. Without it two operations
 * that tie would resolve differently from one render to the next.
 *
 * A missing nonce or timestamp sorts as 0, so a just-broadcast operation that
 * has not been populated yet still compares, rather than making the result
 * NaN-dependent.
 */
export function isLaterOperation(
	current: OperationEntry,
	existing: OperationEntry,
): boolean {
	// The FIRST attempt of each: the dispatch that claimed the nonce and the
	// moment the user acted. A later attempt is the same call re-sent at a higher
	// price, so letting it move the operation would reorder two operations on the
	// strength of one being harder to get mined.
	const currentNonce = current.operation.attempts?.[0]?.nonce ?? 0;
	const existingNonce = existing.operation.attempts?.[0]?.nonce ?? 0;
	if (currentNonce !== existingNonce) {
		return currentNonce > existingNonce;
	}

	const currentTime =
		current.operation.attempts?.[0]?.broadcastTimestampMs ?? 0;
	const existingTime =
		existing.operation.attempts?.[0]?.broadcastTimestampMs ?? 0;
	if (currentTime !== existingTime) {
		return currentTime > existingTime;
	}

	return current.operationID > existing.operationID;
}

/**
 * Keep one operation per key, the latest by `isLaterOperation`, newest first.
 *
 * Two operations sharing a key are mutually exclusive on chain: exactly one of
 * them can take effect, so showing both would promise the user something the
 * chain will not deliver.
 */
export function latestPerKey(
	entries: OperationEntry[],
	keyOf: (entry: OperationEntry) => string,
): OperationEntry[] {
	const latest = new Map<string, OperationEntry>();
	for (const entry of entries) {
		const key = keyOf(entry);
		const existing = latest.get(key);
		if (!existing || isLaterOperation(entry, existing)) {
			latest.set(key, entry);
		}
	}
	// newest first, by the same precedence, so the list order is deterministic
	return [...latest.values()].sort((a, b) => (isLaterOperation(a, b) ? -1 : 1));
}

/** args of `reserveAndMint` are (name, speed, data1, data2, to). */
function melodyNameOf(entry: OperationEntry): string {
	return String(entry.operation.metadata?.args?.[0] ?? 'untitled');
}

/**
 * The melodies this user has submitted and the chain has not caught up with.
 *
 * Keyed by NAME, because that is the melody's identity as far as the contract is
 * concerned: `_nameHashes` makes a name permanently unique, so of two in-flight
 * mints claiming one name at most one can succeed. Two clicks on Mint, or a
 * resubmission that landed as its own operation, must therefore show up once.
 */
export function pendingMelodiesFrom(
	operations: Record<string, OperationLike> | undefined,
): PendingMelody[] {
	const entries = inFlightOperations(operations, ['reserveAndMint']);
	return latestPerKey(entries, melodyNameOf).map((entry) => ({
		operationID: entry.operationID,
		name: melodyNameOf(entry),
	}));
}

/**
 * Pending melodies merged onto what the index returned.
 *
 * The index is authoritative for what exists, and it lags: an operation stops
 * counting as pending the moment it is included, but the indexer only catches up
 * seconds later. The reverse overlap happens too, whenever the indexer is
 * quicker than the transaction observer's next poll, and then the same melody is
 * both listed and pending. The index wins, since it is describing a melody that
 * demonstrably exists.
 */
export function mergePendingMelodies(
	indexed: readonly IndexedMelody[],
	pending: readonly PendingMelody[],
): PendingMelody[] {
	const indexedNames = new Set(
		indexed
			.map((melody) => melody.melody?.name)
			.filter((name): name is string => !!name),
	);
	return pending.filter((melody) => !indexedNames.has(melody.name));
}

/**
 * The three sale entry points, which all take (id, to) first. Whichever one a
 * purchase used, the Bleep being bought and its recipient are in the same place.
 */
const MINT_FUNCTIONS = ['mint', 'mintWithPassId', 'mintWithSalePass'];

/**
 * The Bleeps this user is buying and the chain has not caught up with.
 *
 * Keyed by TOKEN ID, because that is what two purchases can collide over: a
 * Bleep is minted once, so of two in-flight transactions for one id at most one
 * can succeed, and showing both would draw the same tile twice over.
 */
export function pendingBleepsFrom(
	operations: Record<string, OperationLike> | undefined,
): PendingBleep[] {
	const entries = inFlightOperations(operations, MINT_FUNCTIONS);
	return latestPerKey(entries, (entry) =>
		String(entry.operation.metadata?.args?.[0]),
	)
		.map((entry) => ({
			operationID: entry.operationID,
			id: Number(entry.operation.metadata?.args?.[0]),
			to: (entry.operation.metadata?.args?.[1] ??
				ZERO_ADDRESS) as `0x${string}`,
		}))
		.filter((bleep) => Number.isInteger(bleep.id));
}

/**
 * The owners table with this user's in-flight purchases written into it.
 *
 * The chain read wins wherever it has an owner: once a Bleep is minted, who owns
 * it is settled, and a pending transaction claiming otherwise is a transaction
 * that is about to fail.
 */
export function mergePendingBleeps(
	owners: readonly `0x${string}`[],
	pending: readonly PendingBleep[],
): readonly `0x${string}`[] {
	if (pending.length === 0) {
		return owners;
	}
	const merged = [...owners];
	for (const bleep of pending) {
		const onChain = merged[bleep.id];
		if (onChain === undefined || onChain.toLowerCase() === ZERO_ADDRESS) {
			merged[bleep.id] = bleep.to;
		}
	}
	return merged;
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

export function createViewState(params: {
	onchainState: OnchainStateStore;
	operations: FieldReadable<Schema, 'operations'>;
	/** Whether this deployment has a sale contract at all. */
	saleDeployed: boolean;
}): ViewStateStore {
	const {onchainState, operations, saleDeployed} = params;

	const store: Readable<ViewStateValue> = derived(
		[onchainState, operations],
		([$onchainState, $operations]): ViewStateValue => {
			if ($onchainState.step === 'Unloaded') {
				return {step: 'Unloaded'};
			}
			const {treasury} = $onchainState;
			const operationRecord = $operations as unknown as Record<
				string,
				OperationLike
			>;
			const pendingBleeps = pendingBleepsFrom(operationRecord);
			const owners = mergePendingBleeps($onchainState.owners, pendingBleeps);
			return {
				step: 'Loaded',
				bleeps: {
					owners,
					treasury,
					minted: owners.filter(
						(owner: string) => owner.toLowerCase() !== ZERO_ADDRESS,
					).length,
					pendingBleeps,
					pendingMelodies: pendingMelodiesFrom(operationRecord),
					mode: bleepsMode({owners, saleDeployed}),
				},
			};
		},
	);

	return {subscribe: store.subscribe, status: onchainState.status};
}
