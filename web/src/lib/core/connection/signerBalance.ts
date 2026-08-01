import type {OptionalSigner} from '$lib/core/connection/types';
import type {Readable} from 'svelte/store';
import type {PublicClient} from 'viem';
import {
	createPollingStore,
	type PollingStore,
	type PollingValue,
	type PollingStatus,
} from './polling-store';

/**
 * Intentional template building block (not wired into the default app context).
 *
 * Unlike `createBalanceStore` (which tracks a single account), this store polls
 * BOTH the signer's and its owner's balance. It exists for smart-account /
 * session-key setups where the signer (a session key) is distinct from the
 * owner, and a UI wants to show both balances. Wire it up in
 * `src/lib/context/index.ts` if your app needs that; it is kept here as a
 * ready-made piece rather than deleted. See
 * work/notes/observations/signer-balance-store-appears-unused.md.
 */

export type SignerBalanceValue = PollingValue<{signer: bigint; owner: bigint}>;
export type SignerBalanceStatus = PollingStatus;
export type SignerBalanceStore = PollingStore<{signer: bigint; owner: bigint}>;

export function createSignerBalanceStore(
	params: {
		publicClient: PublicClient;
		signer: Readable<OptionalSigner>;
	},
	options?: {
		fetchInterval?: number;
	},
): SignerBalanceStore {
	const {publicClient, signer} = params;

	return createPollingStore(
		async (currentSigner: OptionalSigner) => {
			const [signerBalance, ownerBalance] = await Promise.all([
				publicClient.getBalance({address: currentSigner!.address}),
				publicClient.getBalance({address: currentSigner!.owner}),
			]);
			return {signer: signerBalance, owner: ownerBalance};
		},
		{
			fetchInterval: options?.fetchInterval ?? 5 * 1000,
			source: {
				store: signer,
				key: (s) => s?.address,
			},
		},
	);
}
