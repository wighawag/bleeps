import {BaseError, ContractFunctionRevertedError} from 'viem';
import {txErrorSummary} from '$lib/core/transaction/tx-error-summary';

/**
 * What went wrong with a mint, said in a way a composer can act on.
 *
 * MeloBleeps rejects with `require` strings (`NAME_ALREADY_TAKEN`,
 * `INVALID_SPEED`, ...). Shown raw they are noise: a toast reading
 * `The contract function "reserveAndMint" reverted with the following reason:
 * NAME_ALREADY_TAKEN` tells a composer nothing about what to do next. This
 * module turns those into a headline plus an explanation, and a `code` the UI
 * can branch on to offer the right way out (renaming, for a taken name).
 *
 * Worth knowing for the wording: a mint is gas-estimated before it is sent (see
 * `balanceCheck.ensureCanAfford`), and a revert is deterministic, so a failing
 * mint fails during estimation. The wallet is never asked to sign and no
 * transaction reaches the chain, which is why these explanations can promise
 * that a rejected attempt cost nothing.
 */

export type MintProblemCode =
	/** The name is spoken for, permanently. The one a composer actually hits. */
	| 'name-taken'
	/** The name cannot be encoded at all (quotes, backslash, control chars). */
	| 'invalid-name'
	/** Nothing audible in the melody. */
	| 'silent'
	/** MeloBleeps is not part of this deployment. */
	| 'not-deployed'
	/** The contract said no, for a reason we recognise but cannot fix here. */
	| 'rejected'
	/** Anything else: an RPC that fell over, a wallet that misbehaved. */
	| 'unknown';

export type MintProblem = {
	code: MintProblemCode;
	/** One short line, the headline of the dialog. */
	message: string;
	/** A sentence or two saying what happened and what to do about it. */
	explanation: string;
};

/**
 * What the dialog should offer as the way out of a problem.
 *
 * Not every failure has the same fix, and offering the wrong one wastes the
 * composer's time: a taken name is fixed by renaming, an RPC that fell over by
 * trying again, and a silent melody by neither (the editor is where that gets
 * fixed, so the dialog only gets out of the way).
 */
export type MintWayOut = 'rename' | 'retry' | 'none';

export function wayOutOf(code: MintProblemCode): MintWayOut {
	switch (code) {
		case 'name-taken':
		case 'invalid-name':
			return 'rename';
		case 'silent':
		case 'not-deployed':
			// Retrying would fail identically: nothing about the attempt changed.
			return 'none';
		default:
			return 'retry';
	}
}

/**
 * The `require` string behind an error, if there is one.
 *
 * Tried two ways because the same revert reaches us in two shapes: viem parses
 * it into a `ContractFunctionRevertedError` when it can, but a node that
 * reports the revert only as text (some gas-estimation paths, some wallets)
 * leaves it buried in the message. The caller matches on known reasons, so a
 * loose text fallback is safe.
 */
export function revertReason(error: unknown): string | undefined {
	if (error instanceof BaseError) {
		const reverted = error.walk(
			(e) => e instanceof ContractFunctionRevertedError,
		);
		if (reverted instanceof ContractFunctionRevertedError) {
			return reverted.reason ?? reverted.data?.errorName;
		}
	}
	return undefined;
}

/** The MeloBleeps rejections reachable from `reserveAndMint`. */
const KNOWN: Record<
	string,
	(name: string) => MintProblem & {code: Exclude<MintProblemCode, 'unknown'>}
> = {
	NAME_ALREADY_TAKEN: (name) => ({
		code: 'name-taken',
		message: name ? `"${name}" is already taken` : 'That name is already taken',
		explanation:
			'Melody names are unique and permanent on chain: another melody claimed this one first, and the contract will not let a second have it. Give yours a different name and mint again. Nothing was sent to the chain, so this attempt cost you nothing.',
	}),
	INVALID_SPEED: () => ({
		code: 'rejected',
		message: 'That speed cannot be minted',
		explanation:
			'The contract refuses a speed of zero. Pick one of the speeds in the editor and mint again.',
	}),
	ALREADY_MINTED: () => ({
		code: 'rejected',
		message: 'This melody is already minted',
		explanation:
			'The exact same notes, speed and name already exist as a token. Change something about the melody and mint again.',
	}),
	UNNAMED: () => ({
		code: 'rejected',
		message: 'This melody cannot be minted unnamed',
		explanation:
			'The contract was given a name it did not expect. Give the melody a name and mint again.',
	}),
	NOT_TO_ZEROADDRESS: () => ({
		code: 'rejected',
		message: 'There is nowhere to mint this to',
		explanation:
			'The mint would send the melody to the zero address. Reconnect your wallet and try again.',
	}),
	ONLY_MINTER_ALLOWED: () => ({
		code: 'rejected',
		message: 'This account may not mint',
		explanation:
			'MeloBleeps only accepts mints from its configured minter, and this account is not it.',
	}),
};

/**
 * Read an error thrown by the mint and say what it means.
 *
 * `name` is the name that was being claimed, so a taken-name headline can quote
 * it back rather than talking about "the name" in the abstract.
 */
export function mintProblemFromError(
	error: unknown,
	name: string,
): MintProblem {
	// The parsed reason when viem produced one, otherwise the whole error text:
	// either way the known reasons are matched as substrings, so both shapes and
	// a bare `Error('execution reverted: NAME_ALREADY_TAKEN')` all land.
	const reason = revertReason(error);
	const haystack =
		reason ?? (error instanceof Error ? error.message : String(error));

	for (const [key, build] of Object.entries(KNOWN)) {
		if (haystack.includes(key)) {
			return build(name);
		}
	}

	return {
		code: 'unknown',
		message: txErrorSummary(error),
		explanation:
			'The mint did not go through. The details below are the raw error, which is worth keeping if you report this.',
	};
}
