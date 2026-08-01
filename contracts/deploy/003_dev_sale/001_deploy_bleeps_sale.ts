import {deployScript, artifacts} from '../../rocketh/deploy.js';
import {parseEther} from 'viem';
import {
	MerkleTree,
	createLeavesFromMandalaOwners,
	createLeavesFromPrivateKeys,
	devSalePassPrivateKey,
	hashLeaves,
	type SalePassLeaf,
} from 'bleeps-common';
import type {Abi_Bleeps} from '../../generated/abis/Bleeps.js';

/**
 * The Bleeps sale, brought back for dev chains only.
 *
 * All 576 Bleeps sold on mainnet in 2021 and the sale contract there is spent,
 * so this exists purely so the sale can still be walked through: pass-gated
 * whitelist, then a public phase. See
 * docs/adr/0001-dev-only-sale-and-distribution.md.
 *
 * Two different pass mechanisms exist and both are set up here, because the app
 * uses both:
 *
 *   `mintWithPassId` proves a leaf of `keccak(passId, msg.sender)`, so the pass
 *   is bound to an address. Mainnet issued these to Mandala holders. Here they
 *   go to the dev accounts, so connecting any dev wallet gives you a usable
 *   pass.
 *
 *   `mintWithSalePass` proves a leaf of `keccak(passId, recoveredSigner)` where
 *   the signature is over `keccak(passId, to)`. The pass is a private key, so it
 *   can be handed to somebody as a link and redeemed to any address. The keys
 *   are derived, see `devSalePassPrivateKey`.
 */

/** 0.1 ETH, as on mainnet. */
const PRICE = parseEther('0.1');

/** 25% of every sale to the creator, the rest to the DAO treasury. */
const CREATOR_FEE_PER_10000 = 2500n;

/**
 * Instruments 0..8 may be sold, of which 7 and 8 are reserved for the creator
 * (`isReserved` in BleepsFixedPriceSale), leaving instruments 0..6 - 448
 * Bleeps - actually purchasable. Same as mainnet.
 */
const UPTO_INSTRUMENT = 8n;

/**
 * How many transferable pass keys to generate.
 *
 * Mainnet made 1024 minus the Mandala holders. There is no reason to build a
 * tree that big for a dev chain: 64 is more passes than anyone will redeem by
 * hand, and it keeps the deploy quick.
 */
const NUM_TRANSFERABLE_PASSES = 64;

/** How long the pass-gated phase lasts on a dev chain, in seconds. */
const WHITELIST_DURATION = 60 * 60;

export default deployScript(
	async (env) => {
		const {deployer, projectCreator} = env.namedAccounts;

		const Bleeps = env.get<Abi_Bleeps>('Bleeps');
		const BleepsDAOAccount = env.get('BleepsDAOAccount');

		const privateKeys = Array.from({length: NUM_TRANSFERABLE_PASSES}, (_, i) =>
			devSalePassPrivateKey(i),
		);
		const passKeyLeaves = createLeavesFromPrivateKeys(0, privateKeys);

		// Every dev account gets an address-bound pass, so whichever one you
		// happen to connect with can buy during the whitelist phase.
		const addressBoundLeaves = createLeavesFromMandalaOwners(
			passKeyLeaves.length,
			env.unnamedAccounts.map((id) => ({id, numMandalas: 0})),
		);

		const leaves: SalePassLeaf[] = [...passKeyLeaves, ...addressBoundLeaves];
		const tree = new MerkleTree(hashLeaves(leaves));

		const now = Math.floor(Date.now() / 1000);
		const startTime = now;
		const whitelistEndTime = now + WHITELIST_DURATION;

		const sale = await env.deploy(
			'BleepsInitialSale',
			{
				account: deployer,
				artifact: artifacts.BleepsFixedPriceSale,
				args: [
					Bleeps.address,
					PRICE, // public price
					BigInt(startTime),
					PRICE, // whitelist price, same as mainnet
					BigInt(whitelistEndTime),
					tree.getRoot().hash,
					projectCreator,
					CREATOR_FEE_PER_10000,
					BleepsDAOAccount.address,
					UPTO_INSTRUMENT,
				],
			},
			{
				skipIfAlreadyDeployed: true,
				linkedData: {
					// The web app needs the leaves to build a proof, and on a dev
					// chain it may as well have the keys too: they are derivable
					// anyway. NEVER do this for a real sale.
					leaves,
					privateKeys,
					numPrivatePasses: privateKeys.length,
					startTime,
					publicSaleTimestamp: whitelistEndTime,
					percentageForCreator: Number(CREATOR_FEE_PER_10000),
					price: PRICE.toString(),
				},
			},
		);

		// The sale can only mint if it holds the minter role.
		const currentMinter = await env.read(Bleeps, {functionName: 'minter'});
		if (currentMinter.toLowerCase() !== sale.address.toLowerCase()) {
			const minterAdmin = await env.read(Bleeps, {
				functionName: 'minterAdmin',
			});
			await env.execute(Bleeps, {
				account: minterAdmin,
				functionName: 'setMinter',
				args: [sale.address],
			});
		}
	},
	{
		tags: ['BleepsInitialSale', 'BleepsInitialSale_deploy'],
		dependencies: ['Bleeps_deploy', 'BleepsDAOAccount_deploy'],
	},
);
