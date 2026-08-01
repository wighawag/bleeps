import {expect} from 'earl';
import {describe, it} from 'node:test';
import {network} from 'hardhat';
import {setupFixtures} from './utils/index.js';
import {mintViaMinterAdmin} from './utils/bleeps.js';
import {signPermit, signPermitForAll} from './utils/eip712.js';

const {provider, networkHelpers} = await network.create();
const {deployAll} = setupFixtures(provider);

const DEADLINE = 4000000000n;

describe('Bleeps Permit', function () {
	it('permit works', async function () {
		const fixtures = await networkHelpers.loadFixture(deployAll);
		const {env, Bleeps, unnamedAccounts} = fixtures;
		const chainId = env.network.chain.id;
		const walletClient = env.viem.walletClient;

		for (const id of [1, 2, 3, 4, 5]) {
			await mintViaMinterAdmin(
				fixtures,
				id,
				unnamedAccounts[0],
				unnamedAccounts[0],
			);
		}
		await mintViaMinterAdmin(
			fixtures,
			6,
			unnamedAccounts[0],
			unnamedAccounts[2],
		);

		const tokenId = 1n;
		const owner = unnamedAccounts[0];
		const spender = unnamedAccounts[1];

		const nonce = await env.read(Bleeps, {
			functionName: 'nonces',
			args: [tokenId],
		});

		const signature = await signPermit(
			walletClient,
			owner,
			chainId,
			Bleeps.address,
			{spender, tokenId, nonce, deadline: DEADLINE},
		);

		// Before the permit, the spender has no rights at all.
		await expect(
			env.execute(Bleeps, {
				account: spender,
				functionName: 'transferFrom',
				args: [owner, unnamedAccounts[2], tokenId],
			}),
		).toBeRejectedWith('UNAUTHORIZED_TRANSFER');

		await env.execute(Bleeps, {
			account: spender,
			functionName: 'permit',
			args: [spender, tokenId, DEADLINE, signature],
		});

		// The permit is for ONE token: it must not leak to the owner's others.
		await expect(
			env.execute(Bleeps, {
				account: spender,
				functionName: 'transferFrom',
				args: [owner, unnamedAccounts[2], 2n],
			}),
		).toBeRejectedWith('UNAUTHORIZED_TRANSFER');

		await env.execute(Bleeps, {
			account: spender,
			functionName: 'transferFrom',
			args: [owner, unnamedAccounts[2], tokenId],
		});

		// ...and it must not survive the transfer: the new owner did not sign it.
		await expect(
			env.execute(Bleeps, {
				account: spender,
				functionName: 'transferFrom',
				args: [unnamedAccounts[2], unnamedAccounts[3], tokenId],
			}),
		).toBeRejectedWith('UNAUTHORIZED_TRANSFER');

		// The new owner signs their own permit, for a different spender.
		const nonce2 = await env.read(Bleeps, {
			functionName: 'nonces',
			args: [tokenId],
		});
		const signature2 = await signPermit(
			walletClient,
			unnamedAccounts[2],
			chainId,
			Bleeps.address,
			{
				spender: unnamedAccounts[4],
				tokenId,
				nonce: nonce2,
				deadline: DEADLINE,
			},
		);

		await expect(
			env.execute(Bleeps, {
				account: unnamedAccounts[4],
				functionName: 'transferFrom',
				args: [unnamedAccounts[2], unnamedAccounts[5], tokenId],
			}),
		).toBeRejectedWith('UNAUTHORIZED_TRANSFER');

		// Replaying the FIRST signature under the new owner must not work.
		await expect(
			env.execute(Bleeps, {
				account: unnamedAccounts[4],
				functionName: 'permit',
				args: [unnamedAccounts[4], tokenId, DEADLINE, signature],
			}),
		).toBeRejectedWith('INVALID_SIGNATURE');

		await env.execute(Bleeps, {
			account: unnamedAccounts[4],
			functionName: 'permit',
			args: [unnamedAccounts[4], tokenId, DEADLINE, signature2],
		});

		await expect(
			env.execute(Bleeps, {
				account: unnamedAccounts[4],
				functionName: 'transferFrom',
				args: [unnamedAccounts[2], unnamedAccounts[5], 6n],
			}),
		).toBeRejectedWith('UNAUTHORIZED_TRANSFER');

		await env.execute(Bleeps, {
			account: unnamedAccounts[4],
			functionName: 'transferFrom',
			args: [unnamedAccounts[2], unnamedAccounts[5], tokenId],
		});

		await expect(
			env.execute(Bleeps, {
				account: unnamedAccounts[4],
				functionName: 'transferFrom',
				args: [unnamedAccounts[5], unnamedAccounts[6], tokenId],
			}),
		).toBeRejectedWith('UNAUTHORIZED_TRANSFER');
	});

	it('permitForAll works', async function () {
		const fixtures = await networkHelpers.loadFixture(deployAll);
		const {env, Bleeps, unnamedAccounts} = fixtures;
		const chainId = env.network.chain.id;
		const walletClient = env.viem.walletClient;

		for (const id of [1, 2, 3, 4, 5, 6]) {
			await mintViaMinterAdmin(
				fixtures,
				id,
				unnamedAccounts[0],
				unnamedAccounts[0],
			);
		}

		const owner = unnamedAccounts[0];
		const spender = unnamedAccounts[1];

		const nonce = await env.read(Bleeps, {
			functionName: 'nonces',
			args: [owner],
		});

		const signature = await signPermitForAll(
			walletClient,
			owner,
			chainId,
			Bleeps.address,
			{spender, nonce, deadline: DEADLINE},
		);

		await expect(
			env.execute(Bleeps, {
				account: spender,
				functionName: 'transferFrom',
				args: [owner, unnamedAccounts[2], 1n],
			}),
		).toBeRejectedWith('UNAUTHORIZED_TRANSFER');

		await env.execute(Bleeps, {
			account: spender,
			functionName: 'permitForAll',
			args: [owner, spender, DEADLINE, signature],
		});

		// Unlike `permit`, this one does cover every token the owner holds.
		await env.execute(Bleeps, {
			account: spender,
			functionName: 'transferFrom',
			args: [owner, unnamedAccounts[2], 1n],
		});
		await env.execute(Bleeps, {
			account: spender,
			functionName: 'transferFrom',
			args: [owner, unnamedAccounts[2], 2n],
		});

		const signature2 = await signPermitForAll(
			walletClient,
			owner,
			chainId,
			Bleeps.address,
			{
				spender: unnamedAccounts[4],
				nonce: nonce + 1n,
				deadline: DEADLINE,
			},
		);

		await expect(
			env.execute(Bleeps, {
				account: unnamedAccounts[4],
				functionName: 'transferFrom',
				args: [owner, unnamedAccounts[5], 5n],
			}),
		).toBeRejectedWith('UNAUTHORIZED_TRANSFER');

		// The first signature is spent; presenting it for a new spender fails.
		await expect(
			env.execute(Bleeps, {
				account: unnamedAccounts[4],
				functionName: 'permitForAll',
				args: [owner, unnamedAccounts[4], DEADLINE, signature],
			}),
		).toBeRejectedWith('INVALID_SIGNATURE');

		await env.execute(Bleeps, {
			account: unnamedAccounts[4],
			functionName: 'permitForAll',
			args: [owner, unnamedAccounts[4], DEADLINE, signature2],
		});

		await env.execute(Bleeps, {
			account: unnamedAccounts[4],
			functionName: 'transferFrom',
			args: [owner, unnamedAccounts[5], 5n],
		});
		await env.execute(Bleeps, {
			account: unnamedAccounts[4],
			functionName: 'transferFrom',
			args: [owner, unnamedAccounts[5], 6n],
		});
	});
});
