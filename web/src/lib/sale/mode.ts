import {NOTES_PER_INSTRUMENT, isOwned} from '$lib/bleeps/grid';

/**
 * Which experience the app offers.
 *
 * Not a flag, and deliberately not one: the app works out for itself whether
 * there is a sale to run, from the two facts that decide it.
 *
 *   `mint`   there is a sale deployed AND it still has something to sell
 *   `browse` anything else
 *
 * That is self-correcting. Mainnet sold out in 2021, so the app lands in browse
 * mode there without being told; a dev chain seeded with a live sale lands in
 * mint mode; and the moment the last Bleep is sold, wherever that happens, the
 * app follows on its own. See docs/adr/0001-dev-only-sale-and-distribution.md.
 */
export type BleepsMode = 'mint' | 'browse';

/**
 * Instruments 7 and 8 are reserved to the creator (`isReserved` in
 * BleepsFixedPriceSale) and can never be bought, so an unminted one is not
 * something the sale can sell and must not put the app into mint mode.
 */
export function isCreatorReserved(id: number): boolean {
	const instrument = Math.floor(id / NOTES_PER_INSTRUMENT);
	return instrument === 7 || instrument === 8;
}

/** Whether the sale could still sell this Bleep. */
export function isForSale(
	id: number,
	owner: string | undefined | null,
): boolean {
	return !isCreatorReserved(id) && !isOwned(owner ?? undefined);
}

export function bleepsMode(params: {
	/** The owners table, indexed by token id. */
	owners: readonly (string | undefined)[];
	/** Whether this deployment has a sale contract at all. */
	saleDeployed: boolean;
}): BleepsMode {
	const {owners, saleDeployed} = params;
	if (!saleDeployed) {
		return 'browse';
	}
	return owners.some((owner, id) => isForSale(id, owner)) ? 'mint' : 'browse';
}

/** The ids the sale could still sell, in order. */
export function idsForSale(owners: readonly (string | undefined)[]): number[] {
	const ids: number[] = [];
	owners.forEach((owner, id) => {
		if (isForSale(id, owner)) {
			ids.push(id);
		}
	});
	return ids;
}
