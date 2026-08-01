import type {TypedDeployments} from '$lib/core/connection/types';
import {
	createPollingStore,
	type PollingStore,
	type PollingValue,
	type PollingStatus,
} from '$lib/core/connection/polling-store';
import type {PublicClient} from 'viem';
import type {Readable} from 'svelte/store';

/**
 * The Bleeps world, as read from the chain.
 *
 * `owners` is the whole 576-entry table in one call, because that is what the
 * grid needs and the contract offers exactly that batch read. `treasury` is the
 * DAO's balance, which is what the sale pays into.
 */
export type BleepsState = {
	readonly owners: readonly `0x${string}`[];
	readonly treasury: bigint;
};

export type OnchainStateValue = PollingValue<BleepsState>;
export type OnchainStateStatus = PollingStatus;
export type OnchainStateStore = PollingStore<BleepsState>;

/** Fixed by the contract: 64 notes across 9 instruments. */
export const NUM_BLEEPS = 576;

const ALL_IDS = Array.from({length: NUM_BLEEPS}, (_, i) => BigInt(i));

export function createOnchainState(params: {
	publicClient: PublicClient;
	deployments: TypedDeployments;
	config: {
		fetchInterval?: number;
		[key: string]: unknown;
	};
	/**
	 * Optional gate: chain reads only run while this source is truthy. Used to
	 * avoid fetching (and surfacing an RPC error) when the app has no RPC of its
	 * own and the wallet is not connected yet.
	 */
	fetchGate?: Readable<boolean>;
}): OnchainStateStore {
	const {publicClient, deployments, config} = params;

	return createPollingStore(
		async () => {
			const [owners, treasury] = await Promise.all([
				publicClient.readContract({
					...deployments.contracts.Bleeps,
					functionName: 'owners',
					args: [ALL_IDS],
				}),
				publicClient.getBalance({
					address: deployments.contracts.BleepsDAOAccount.address,
				}),
			]);
			return {owners: owners as readonly `0x${string}`[], treasury};
		},
		{
			fetchInterval: config.fetchInterval ?? 5_000,
			...(params.fetchGate ? {source: {store: params.fetchGate}} : {}),
		},
	);
}
