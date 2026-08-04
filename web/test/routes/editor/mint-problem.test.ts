import {describe, expect, it} from 'vitest';
import {
	BaseError,
	ContractFunctionExecutionError,
	ContractFunctionRevertedError,
} from 'viem';
import {
	mintProblemFromError,
	revertReason,
	wayOutOf,
} from '../../../src/routes/editor/lib/mint-problem';

/**
 * The same revert reaches the app in more than one shape, so both are covered:
 * viem parses it into a `ContractFunctionRevertedError` when it can, and some
 * nodes/wallets only leave the `require` string in the message text.
 */
function viemRevert(reason: string): BaseError {
	const reverted = new ContractFunctionRevertedError({
		abi: [
			{
				type: 'function',
				name: 'reserveAndMint',
				inputs: [],
				outputs: [],
				stateMutability: 'nonpayable',
			},
		],
		functionName: 'reserveAndMint',
		message: `execution reverted: ${reason}`,
	});
	// Force the parsed reason: constructing it from a raw message does not always
	// populate `reason`, and it is `reason` the app reads.
	(reverted as {reason?: string}).reason = reason;

	return new ContractFunctionExecutionError(reverted, {
		abi: [],
		functionName: 'reserveAndMint',
	}) as unknown as BaseError;
}

describe('revertReason', () => {
	it('reads the reason viem parsed', () => {
		expect(revertReason(viemRevert('NAME_ALREADY_TAKEN'))).toEqual(
			'NAME_ALREADY_TAKEN',
		);
	});

	it('has no reason for something that is not a contract revert', () => {
		expect(revertReason(new Error('the RPC fell over'))).toBeUndefined();
	});
});

describe('mintProblemFromError', () => {
	it('names the taken name, so the composer knows which one to change', () => {
		const problem = mintProblemFromError(
			viemRevert('NAME_ALREADY_TAKEN'),
			'Old MacDonald',
		);

		expect(problem.code).toEqual('name-taken');
		expect(problem.message).toContain('Old MacDonald');
	});

	it('recognises a revert that only appears as text', () => {
		// A node that reports the revert as a plain message must reach the same
		// explanation, or the composer gets the raw dump for the one failure that
		// actually has a fix.
		const problem = mintProblemFromError(
			new Error('execution reverted: NAME_ALREADY_TAKEN'),
			'Chiptune',
		);

		expect(problem.code).toEqual('name-taken');
		expect(problem.message).toContain('Chiptune');
	});

	it('promises the failed attempt cost nothing, because it did', () => {
		// The mint is gas-estimated first, so a revert never reaches the chain.
		// Saying so is the difference between "it broke" and "try another name".
		const problem = mintProblemFromError(
			viemRevert('NAME_ALREADY_TAKEN'),
			'Chiptune',
		);

		expect(problem.explanation).toMatch(/cost you nothing/i);
	});

	it('explains other MeloBleeps rejections without offering a rename', () => {
		const problem = mintProblemFromError(viemRevert('INVALID_SPEED'), 'x');

		expect(problem.code).toEqual('rejected');
		expect(problem.explanation.length).toBeGreaterThan(0);
	});

	it('falls back to the error summary when nothing is recognised', () => {
		const problem = mintProblemFromError(new Error('the RPC fell over'), 'x');

		expect(problem.code).toEqual('unknown');
		expect(problem.message).toEqual('the RPC fell over');
	});

	it('does not mistake an unrelated error for a taken name', () => {
		const problem = mintProblemFromError(new Error('user rejected'), 'x');
		expect(problem.code).not.toEqual('name-taken');
	});
});

describe('wayOutOf', () => {
	it('offers a rename for the problems a rename fixes', () => {
		expect(wayOutOf('name-taken')).toEqual('rename');
		expect(wayOutOf('invalid-name')).toEqual('rename');
	});

	it('offers a retry only where retrying could behave differently', () => {
		expect(wayOutOf('unknown')).toEqual('retry');
		expect(wayOutOf('rejected')).toEqual('retry');
	});

	it('offers nothing when the fix is back in the editor', () => {
		// Retrying a silent melody fails identically: nothing about it changed.
		expect(wayOutOf('silent')).toEqual('none');
		expect(wayOutOf('not-deployed')).toEqual('none');
	});
});
