/**
 * What state the dev sale should be left in.
 *
 * Mainnet is sold out, so the state a dev chain should REPRODUCE by default is
 * "sold out": every Bleep owned, the DAO holding the proceeds, nothing to buy.
 * The app then lands in browse mode on its own, without a flag to remember, and
 * matches what a user of bleeps.art actually sees.
 *
 * A live sale is the exception, so it is the thing you opt into:
 *
 *     BLEEPS_DEV_SALE=live pnpm contracts:deploy localhost
 *
 * That runs the sale the way it ran in 2021: the pass-gated whitelist phase
 * opens at deploy time, the dev accounts and half the transferable passes are
 * redeemed, and the rest of the Bleeps are left to buy, so both pass mechanisms
 * and the public phase are reachable from the app.
 *
 * The two modes differ in the sale's TIMES as well as in the seeding, which is
 * why this lives beside both scripts rather than inside either:
 *
 *   sold-out: the whitelist window is already over when the sale is deployed, so
 *             the seeding can buy the remaining Bleeps through the public phase.
 *             There are only ~80 passes and 448 Bleeps to sell, so a pass-gated
 *             sell-out is not possible in the first place.
 *   live:     the whitelist window opens at deploy time and runs for an hour.
 *
 * The mode is fixed when the SALE is deployed, not when the seeding runs: the
 * sale's times are immutable constructor arguments and the deploy is
 * skipIfAlreadyDeployed, so switching mode means a fresh chain (locally, restart
 * the node) or a fresh sale deployment.
 */
export type DevSaleMode = 'sold-out' | 'live';

/**
 * @param override what the caller asked for, ahead of the environment. The sale
 * TESTS pass this (through rocketh's `extra`), because they are about the
 * pass-gated phase and must not depend on a variable somebody's shell happens to
 * have set.
 */
export function devSaleMode(override?: unknown): DevSaleMode {
	const asked = override ?? process.env.BLEEPS_DEV_SALE;
	const requested = String(asked ?? '')
		.trim()
		.toLowerCase();
	if (!requested || requested === 'sold-out' || requested === 'soldout') {
		return 'sold-out';
	}
	if (requested === 'live') {
		return 'live';
	}
	throw new Error(
		`the dev sale mode must be 'live' or 'sold-out' (or unset, which means sold-out), not '${asked}'`,
	);
}

/** How long the pass-gated phase lasts on a dev chain, in seconds. */
export const WHITELIST_DURATION = 60 * 60;

/**
 * The sale's start and whitelist-end times for a mode, as unix seconds.
 *
 * In sold-out mode both are in the past, so `mint` (the passless public entry
 * point) is open the moment the sale is deployed and the seeding can sell out.
 */
export function devSaleTimes(
	mode: DevSaleMode,
	now: number = Math.floor(Date.now() / 1000),
): {startTime: number; whitelistEndTime: number} {
	if (mode === 'live') {
		return {startTime: now, whitelistEndTime: now + WHITELIST_DURATION};
	}
	return {
		startTime: now - 2 * WHITELIST_DURATION,
		whitelistEndTime: now - WHITELIST_DURATION,
	};
}
