import {expect} from 'earl';
import {describe, it} from 'node:test';
import {network} from 'hardhat';
import {parseEther} from 'viem';
import {
	setupSaleFixtures,
	addressBoundPass,
	transferablePass,
} from './utils/sale.js';

const {provider, networkHelpers} = await network.create();
const {deploySale} = setupSaleFixtures(provider);

const PRICE = parseEther('0.1');

/** Instrument 0, so open for sale and not reserved. */
const FOR_SALE_ID = 1;
/** Instrument 7, reserved for the creator. */
const RESERVED_ID = 448;

describe('BleepsFixedPriceSale', function () {
	it('a Bleep can be bought with an address-bound pass', async function () {
		const fixtures = await networkHelpers.loadFixture(deploySale);
		const {env, Bleeps, sale, unnamedAccounts} = fixtures;

		const buyer = unnamedAccounts[0];
		const {passId, proof} = addressBoundPass(fixtures, buyer);

		await env.execute(sale, {
			account: buyer,
			functionName: 'mintWithPassId',
			args: [FOR_SALE_ID, buyer, passId, proof],
			value: PRICE,
		});

		expect(
			(
				await env.read(Bleeps, {
					functionName: 'ownerOf',
					args: [BigInt(FOR_SALE_ID)],
				})
			).toLowerCase(),
		).toEqual(buyer.toLowerCase());
	});

	it('a pass cannot be used twice', async function () {
		const fixtures = await networkHelpers.loadFixture(deploySale);
		const {env, sale, unnamedAccounts} = fixtures;

		const buyer = unnamedAccounts[0];
		const {passId, proof} = addressBoundPass(fixtures, buyer);

		await env.execute(sale, {
			account: buyer,
			functionName: 'mintWithPassId',
			args: [FOR_SALE_ID, buyer, passId, proof],
			value: PRICE,
		});

		await expect(
			env.execute(sale, {
				account: buyer,
				functionName: 'mintWithPassId',
				args: [FOR_SALE_ID + 1, buyer, passId, proof],
				value: PRICE,
			}),
		).toBeRejectedWith('PASS_ALREADY_USED');
	});

	it("someone else's address-bound pass is no use", async function () {
		const fixtures = await networkHelpers.loadFixture(deploySale);
		const {env, sale, unnamedAccounts} = fixtures;

		// The leaf commits to (passId, owner), so presenting it from another
		// account makes the computed leaf, and therefore the proof, wrong.
		const {passId, proof} = addressBoundPass(fixtures, unnamedAccounts[0]);

		await expect(
			env.execute(sale, {
				account: unnamedAccounts[1],
				functionName: 'mintWithPassId',
				args: [FOR_SALE_ID, unnamedAccounts[1], passId, proof],
				value: PRICE,
			}),
		).toBeRejectedWith('INVALID_PROOF');
	});

	it('a transferable pass can be redeemed by anyone, to anyone', async function () {
		const fixtures = await networkHelpers.loadFixture(deploySale);
		const {env, Bleeps, sale, unnamedAccounts} = fixtures;

		const recipient = unnamedAccounts[4];
		const sender = unnamedAccounts[5];
		const {passId, signature, proof} = await transferablePass(
			fixtures,
			0,
			recipient,
		);

		// This is the pass-as-a-link case: the sender holds no pass of their own
		// and is not the recipient.
		await env.execute(sale, {
			account: sender,
			functionName: 'mintWithSalePass',
			args: [FOR_SALE_ID, recipient, passId, signature, proof],
			value: PRICE,
		});

		expect(
			(
				await env.read(Bleeps, {
					functionName: 'ownerOf',
					args: [BigInt(FOR_SALE_ID)],
				})
			).toLowerCase(),
		).toEqual(recipient.toLowerCase());
	});

	it('a transferable pass signature is bound to its recipient', async function () {
		const fixtures = await networkHelpers.loadFixture(deploySale);
		const {env, sale, unnamedAccounts} = fixtures;

		// Signed for account 4, presented for account 6: the recovered signer is
		// not the pass, so the leaf does not match.
		const {passId, signature, proof} = await transferablePass(
			fixtures,
			0,
			unnamedAccounts[4],
		);

		await expect(
			env.execute(sale, {
				account: unnamedAccounts[5],
				functionName: 'mintWithSalePass',
				args: [FOR_SALE_ID, unnamedAccounts[6], passId, signature, proof],
				value: PRICE,
			}),
		).toBeRejectedWith('INVALID_PROOF');
	});

	it('the price is split between the creator and the DAO', async function () {
		const fixtures = await networkHelpers.loadFixture(deploySale);
		const {env, sale, BleepsDAOAccount, namedAccounts, unnamedAccounts} =
			fixtures;

		const buyer = unnamedAccounts[0];
		const {passId, proof} = addressBoundPass(fixtures, buyer);

		const creatorBefore = await env.viem.publicClient.getBalance({
			address: namedAccounts.projectCreator,
		});
		const daoBefore = await env.viem.publicClient.getBalance({
			address: BleepsDAOAccount.address,
		});

		await env.execute(sale, {
			account: buyer,
			functionName: 'mintWithPassId',
			args: [FOR_SALE_ID, buyer, passId, proof],
			value: PRICE,
		});

		const creatorAfter = await env.viem.publicClient.getBalance({
			address: namedAccounts.projectCreator,
		});
		const daoAfter = await env.viem.publicClient.getBalance({
			address: BleepsDAOAccount.address,
		});

		// 25% creator, 75% DAO, and nothing left behind in the sale contract.
		expect(creatorAfter - creatorBefore).toEqual((PRICE * 2500n) / 10000n);
		expect(daoAfter - daoBefore).toEqual(PRICE - (PRICE * 2500n) / 10000n);
		expect(
			await env.viem.publicClient.getBalance({address: sale.address}),
		).toEqual(0n);
	});

	it('overpaying is refunded', async function () {
		const fixtures = await networkHelpers.loadFixture(deploySale);
		const {env, sale, unnamedAccounts} = fixtures;

		const buyer = unnamedAccounts[0];
		const {passId, proof} = addressBoundPass(fixtures, buyer);

		const before = await env.viem.publicClient.getBalance({address: buyer});
		const receipt = await env.execute(sale, {
			account: buyer,
			functionName: 'mintWithPassId',
			args: [FOR_SALE_ID, buyer, passId, proof],
			value: PRICE * 3n,
		});
		const after = await env.viem.publicClient.getBalance({address: buyer});

		const gas =
			BigInt(receipt.gasUsed) * BigInt(receipt.effectiveGasPrice ?? 0);
		expect(before - after - gas).toEqual(PRICE);
	});

	it('underpaying is rejected', async function () {
		const fixtures = await networkHelpers.loadFixture(deploySale);
		const {env, sale, unnamedAccounts} = fixtures;

		const buyer = unnamedAccounts[0];
		const {passId, proof} = addressBoundPass(fixtures, buyer);

		await expect(
			env.execute(sale, {
				account: buyer,
				functionName: 'mintWithPassId',
				args: [FOR_SALE_ID, buyer, passId, proof],
				value: PRICE - 1n,
			}),
		).toBeRejectedWith('NOT_ENOUGH');
	});

	it('the reserved instruments cannot be bought', async function () {
		const fixtures = await networkHelpers.loadFixture(deploySale);
		const {env, sale, unnamedAccounts} = fixtures;

		const buyer = unnamedAccounts[0];
		const {passId, proof} = addressBoundPass(fixtures, buyer);

		// Instruments 7 and 8 are the creator's, whatever pass you hold.
		await expect(
			env.execute(sale, {
				account: buyer,
				functionName: 'mintWithPassId',
				args: [RESERVED_ID, buyer, passId, proof],
				value: PRICE,
			}),
		).toBeRejectedWith('RESERVED');
	});

	it('only the creator can mint the reserved instruments', async function () {
		const fixtures = await networkHelpers.loadFixture(deploySale);
		const {env, Bleeps, sale, namedAccounts, unnamedAccounts} = fixtures;

		await expect(
			env.execute(sale, {
				account: unnamedAccounts[0],
				functionName: 'creatorMint',
				args: [RESERVED_ID, unnamedAccounts[0]],
			}),
		).toBeRejectedWith('NOT_AUTHORIZED');

		await env.execute(sale, {
			account: namedAccounts.projectCreator,
			functionName: 'creatorMint',
			args: [RESERVED_ID, namedAccounts.projectCreator],
		});

		expect(
			(
				await env.read(Bleeps, {
					functionName: 'ownerOf',
					args: [BigInt(RESERVED_ID)],
				})
			).toLowerCase(),
		).toEqual(namedAccounts.projectCreator.toLowerCase());
	});

	it('no pass is needed once the public phase starts', async function () {
		const fixtures = await networkHelpers.loadFixture(deploySale);
		const {env, Bleeps, sale, linkedData, unnamedAccounts} = fixtures;

		const buyer = unnamedAccounts[9];

		// During the whitelist phase, the passless path is closed.
		await expect(
			env.execute(sale, {
				account: buyer,
				functionName: 'mint',
				args: [FOR_SALE_ID, buyer],
				value: PRICE,
			}),
		).toBeRejectedWith('REQUIRE_PASS_OR_WAIT');

		await networkHelpers.time.increaseTo(linkedData.publicSaleTimestamp + 1);

		await env.execute(sale, {
			account: buyer,
			functionName: 'mint',
			args: [FOR_SALE_ID, buyer],
			value: PRICE,
		});

		expect(
			(
				await env.read(Bleeps, {
					functionName: 'ownerOf',
					args: [BigInt(FOR_SALE_ID)],
				})
			).toLowerCase(),
		).toEqual(buyer.toLowerCase());
	});
});
