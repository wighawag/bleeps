import {expect} from 'earl';
import {describe, it} from 'node:test';
import {network} from 'hardhat';
import {setupFixtures} from './utils/index.js';
import {mintViaMinterAdmin} from './utils/bleeps.js';
import {signDelegation} from './utils/eip712.js';

const {provider, networkHelpers} = await network.create();
const {deployAll} = setupFixtures(provider);

const EXPIRY = 4000000000n;

describe('Bleeps Checkpointing', function () {
	it('delegation via signature works', async function () {
		const fixtures = await networkHelpers.loadFixture(deployAll);
		const {env, Bleeps, unnamedAccounts} = fixtures;
		const chainId = env.network.chain.id;
		const walletClient = env.viem.walletClient;

		const tokenHolder = unnamedAccounts[0];
		const delegatee = unnamedAccounts[1];
		const delegatee2 = unnamedAccounts[2];

		for (const id of [1, 2, 3, 4, 5]) {
			await mintViaMinterAdmin(fixtures, id, tokenHolder, tokenHolder);
		}

		const votesOf = (account: `0x${string}`) =>
			env.read(Bleeps, {functionName: 'getCurrentVotes', args: [account]});

		const previousVoteForTokenHolder = await votesOf(tokenHolder);
		const previousVoteForDelegatee = await votesOf(delegatee);
		const previousVoteForDelegatee2 = await votesOf(delegatee2);

		const signature = await signDelegation(
			walletClient,
			tokenHolder,
			chainId,
			Bleeps.address,
			{delegatee, nonce: 0n, expiry: EXPIRY},
		);

		await env.execute(Bleeps, {
			account: delegatee,
			functionName: 'delegateBySig',
			args: [delegatee, 0n, EXPIRY, signature.v, signature.r, signature.s],
		});

		expect(await votesOf(tokenHolder)).toEqual(0n);
		expect(await votesOf(delegatee)).toEqual(
			previousVoteForTokenHolder + previousVoteForDelegatee,
		);

		const signature2 = await signDelegation(
			walletClient,
			tokenHolder,
			chainId,
			Bleeps.address,
			{delegatee: delegatee2, nonce: 1n, expiry: EXPIRY},
		);

		// The nonce is checked against the signature's recovered signer, so a
		// wrong nonce is rejected outright.
		await expect(
			env.execute(Bleeps, {
				account: delegatee2,
				functionName: 'delegateBySig',
				args: [
					delegatee2,
					2n,
					EXPIRY,
					signature2.v,
					signature2.r,
					signature2.s,
				],
			}),
		).toBeRejectedWith('ERC721Checkpointable::delegateBySig: invalid nonce');

		// Submitting the signature with a DIFFERENT delegatee argument does not
		// revert: the signature recovers to some other address, whose (empty)
		// delegation is what gets changed. The token holder's votes are untouched.
		// This is a known sharp edge of the Nouns-derived checkpointing, pinned
		// here so a future change to it is a visible decision rather than an
		// accident.
		await env.execute(Bleeps, {
			account: delegatee2,
			functionName: 'delegateBySig',
			args: [delegatee, 0n, EXPIRY, signature2.v, signature2.r, signature2.s],
		});

		expect(await votesOf(tokenHolder)).toEqual(0n);
		expect(await votesOf(delegatee)).toEqual(
			previousVoteForTokenHolder + previousVoteForDelegatee,
		);

		await env.execute(Bleeps, {
			account: delegatee2,
			functionName: 'delegateBySig',
			args: [delegatee2, 1n, EXPIRY, signature2.v, signature2.r, signature2.s],
		});

		expect(await votesOf(tokenHolder)).toEqual(0n);
		expect(await votesOf(delegatee)).toEqual(0n);
		expect(await votesOf(delegatee2)).toEqual(
			previousVoteForTokenHolder + previousVoteForDelegatee2,
		);
	});
});
