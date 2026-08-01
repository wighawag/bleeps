import type {AccountStore} from '$lib/core/connection/types';
import type {PublicClient} from 'viem';
import {
	createPollingStore,
	type PollingStore,
	type PollingValue,
	type PollingStatus,
} from './polling-store';

export type BalanceValue = PollingValue<{value: bigint}>;
export type BalanceStatus = PollingStatus;
export type BalanceStore = PollingStore<{value: bigint}>;

export function createBalanceStore(
	params: {
		publicClient: PublicClient;
		account: AccountStore;
	},
	options?: {
		fetchInterval?: number;
	},
): BalanceStore {
	const {publicClient, account} = params;

	return createPollingStore(
		async (address: `0x${string}` | undefined) => {
			const value = await publicClient.getBalance({address: address!});
			return {value};
		},
		{
			fetchInterval: options?.fetchInterval ?? 5 * 1000,
			source: {store: account},
		},
	);
}
