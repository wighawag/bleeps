import type {PublicClient} from 'viem';
import {
	createPollingStore,
	type PollingStore,
} from '$lib/core/connection/polling-store';
import type {SaleDeployment} from '$lib/sale/deployment';
import type {Readable} from 'svelte/store';

/**
 * What the sale contract says about itself right now.
 *
 * The deployment record already carries the price and the two timestamps, and
 * they are constructor immutables so they cannot drift. They are read from the
 * chain anyway, because the value a transaction has to carry is the one thing
 * here that must not be a guess, and `ownersAndPriceInfo` returns the lot in a
 * single call.
 *
 * `passUsed` is the part that actually changes, and it is what makes the pass
 * banner tell the truth after somebody spends a pass in another tab.
 */
export type SaleInfo = {
	/** Wei to send in the public phase. */
	price: bigint;
	/** Wei to send while a pass is required. */
	whitelistPrice: bigint;
	/** Unix seconds. */
	startTime: number;
	/** Unix seconds: when the pass requirement lapses. */
	whitelistEndTime: number;
	/** Whether the pass this was asked about has been spent. */
	passUsed: boolean;
	/** Highest instrument open for sale. */
	uptoInstrument: number;
};

export type SaleInfoStore = PollingStore<SaleInfo>;

/**
 * Which pass to ask about, and whether to ask at all.
 *
 * `undefined` means do not fetch, which is how a sold-out deployment stops
 * reading a contract with nothing left to say. "No pass, but do read the price"
 * is `{passId: undefined}`: the object is truthy, which is what the polling
 * store's gate looks at.
 */
export type PassSource = Readable<{passId: number | undefined} | undefined>;

export function createSaleInfo(params: {
	publicClient: PublicClient;
	sale: SaleDeployment;
	/**
	 * The pass to ask about. Re-read whenever it changes, so connecting a wallet
	 * (or following a pass link) updates `passUsed` without a page reload.
	 */
	passId: PassSource;
	fetchInterval?: number;
}): SaleInfoStore {
	const {publicClient, sale, passId} = params;

	return createPollingStore<SaleInfo, {passId: number | undefined} | undefined>(
		async (source) => {
			const currentPassId = source?.passId;
			const result = (await publicClient.readContract({
				address: sale.address,
				abi: sale.abi,
				functionName: 'ownersAndPriceInfo',
				// No ids: the owners table is already polled by onchainState, and
				// asking for 576 addresses a second time would double that read.
				args: [BigInt(currentPassId ?? 0), []],
			})) as readonly [
				readonly `0x${string}`[],
				bigint,
				bigint,
				bigint,
				bigint,
				`0x${string}`,
				boolean,
				bigint,
			];

			const [
				,
				price,
				startTime,
				whitelistPrice,
				whitelistEndTime,
				,
				passUsed,
				uptoInstr,
			] = result;

			return {
				price,
				whitelistPrice,
				startTime: Number(startTime),
				whitelistEndTime: Number(whitelistEndTime),
				// Meaningless when there is no pass: pass 0 belongs to somebody else.
				passUsed: currentPassId === undefined ? false : passUsed,
				uptoInstrument: Number(uptoInstr),
			};
		},
		{
			fetchInterval: params.fetchInterval ?? 5_000,
			source: {
				store: passId,
				key: (source) => (source ? String(source.passId) : 'off'),
			},
		},
	);
}

/** Which phase the sale is in, against the times the contract itself reports. */
export type SalePhase = 'not-started' | 'whitelist' | 'public';

export function salePhase(info: SaleInfo, nowSeconds: number): SalePhase {
	if (nowSeconds < info.startTime) {
		return 'not-started';
	}
	if (nowSeconds < info.whitelistEndTime) {
		return 'whitelist';
	}
	return 'public';
}

/** What a purchase must carry, in the phase the sale is actually in. */
export function priceFor(info: SaleInfo, phase: SalePhase): bigint {
	return phase === 'public' ? info.price : info.whitelistPrice;
}
