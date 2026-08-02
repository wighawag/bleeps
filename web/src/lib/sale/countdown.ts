/**
 * The sale clock, as the site has always shown it.
 *
 * The wording and the shape of the countdown are the pre-template site's: a
 * private sale for Mandala holders and Discord members that opens at a time,
 * runs for a while, then gives way to a public sale. Only the plumbing moved.
 */

/**
 * The original `time2text`, kept verbatim in behaviour: seconds up to two
 * minutes, then minutes and seconds up to two hours, then hours and minutes.
 */
export function time2text(numSeconds: number): string {
	if (numSeconds < 120) {
		return `${numSeconds} seconds`;
	} else if (numSeconds < 7200) {
		return `${Math.floor(numSeconds / 60)} minutes and ${numSeconds % 60} seconds`;
	} else {
		return `${Math.floor(numSeconds / 60 / 60)} hours and ${Math.floor(
			(numSeconds % 3600) / 60,
		)} minutes`;
	}
}

export type SaleCountdownState =
	| {phase: 'not-started'; opensIn: string}
	| {phase: 'whitelist'; timeLeft: string}
	| {phase: 'public'};

/**
 * Where the sale is against the clock.
 *
 * Both timestamps come from the deployment record (`BleepsInitialSale`'s
 * linkedData), which is where the sale wrote them; the contract's own
 * `priceInfo` returns the same immutables.
 */
export function saleCountdown(params: {
	/** Unix seconds. */
	startTime: number;
	/** Unix seconds. */
	publicSaleTimestamp: number;
	/** Unix seconds. */
	nowSeconds: number;
}): SaleCountdownState {
	const {startTime, publicSaleTimestamp, nowSeconds} = params;

	if (nowSeconds < startTime) {
		return {phase: 'not-started', opensIn: time2text(startTime - nowSeconds)};
	}
	if (nowSeconds < publicSaleTimestamp) {
		return {
			phase: 'whitelist',
			timeLeft: time2text(publicSaleTimestamp - nowSeconds),
		};
	}
	return {phase: 'public'};
}
