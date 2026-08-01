import {deployScript} from '../../rocketh/deploy.js';
import {encodePacked, keccak256, parseEther, serializeSignature} from 'viem';
import {privateKeyToAccount, sign} from 'viem/accounts';
import {
	MerkleTree,
	calculateHash,
	hashLeaves,
	type SalePassLeaf,
} from 'bleeps-common';
import type {Abi_Bleeps} from '../../generated/abis/Bleeps.js';
import type {Abi_BleepsFixedPriceSale} from '../../generated/abis/BleepsFixedPriceSale.js';

/**
 * Put a dev chain into the middle of the sale.
 *
 * The point is that the state is reached the way mainnet reached it, THROUGH the
 * sale, rather than minted into place. So the DAO treasury holds real proceeds,
 * the creator holds their real cut, the pass bitmask has genuinely used passes
 * in it, and the app's "buy this Bleep" path has both sold and unsold Bleeps to
 * render.
 *
 * What is deliberately NOT done is selling out. Roughly two thirds of the
 * instruments are left purchasable, and half the transferable passes are left
 * unredeemed, so the flows under test are still reachable after the deploy.
 */

/** Instruments 7 and 8, which only the creator can mint. */
const RESERVED_IDS = Array.from({length: 128}, (_, i) => 448 + i);

/**
 * Mints per transaction.
 *
 * Bleeps are checkpointed, so each mint writes an owner slot and a voting
 * checkpoint: about 30k gas, and more for a first-time holder. Minting all 576
 * in one call costs 17,390,329 gas, just over EIP-7825's 16,777,216
 * per-transaction cap, so bulk minting has to be split. 48 leaves plenty of
 * headroom. See docs/adr/0002-melobleeps-tokenuri-gas.md.
 */
const MINTS_PER_TRANSACTION = 48;

/** How many of the transferable passes to redeem, leaving the rest to try by hand. */
const PASSES_TO_REDEEM = 32;

const PRICE = parseEther('0.1');

export default deployScript(
	async (env) => {
		const {deployer, projectCreator} = env.namedAccounts;

		const Bleeps = env.get<Abi_Bleeps>('Bleeps');
		const sale = env.get<Abi_BleepsFixedPriceSale>('BleepsInitialSale');

		const linkedData = sale.linkedData as {
			leaves: SalePassLeaf[];
			privateKeys: `0x${string}`[];
		};
		const tree = new MerkleTree(hashLeaves(linkedData.leaves));

		const alreadySeeded = await env
			.read(Bleeps, {
				functionName: 'ownerOf',
				args: [448n],
			})
			.catch(() => undefined);
		if (alreadySeeded) {
			env.showMessage('sale already seeded');
			return;
		}

		// 1. The creator takes the two reserved instruments, as on mainnet.
		for (let i = 0; i < RESERVED_IDS.length; i += MINTS_PER_TRANSACTION) {
			await env.execute(sale, {
				account: projectCreator,
				functionName: 'creatorMultiMint',
				args: [
					RESERVED_IDS.slice(i, i + MINTS_PER_TRANSACTION),
					projectCreator,
				],
			});
		}

		// 2. Each dev account buys one with the pass bound to its own address.
		//    A pass is single-use, so this is exactly one Bleep each.
		let nextId = 0;
		for (const account of env.unnamedAccounts) {
			const passId = linkedData.leaves.findIndex(
				(leaf) => leaf.signer.toLowerCase() === account.toLowerCase(),
			);
			if (passId < 0) {
				continue;
			}
			await env.execute(sale, {
				account,
				functionName: 'mintWithPassId',
				args: [
					nextId,
					account,
					BigInt(passId),
					tree.getProof(calculateHash(String(passId), account)),
				],
				value: PRICE,
			});
			nextId++;
		}

		// 3. Redeem some of the transferable passes. The pass key signs over the
		//    RECIPIENT, so the transaction itself can come from anyone: this is
		//    what makes a pass shareable as a link.
		for (let i = 0; i < PASSES_TO_REDEEM; i++) {
			const passKey = linkedData.privateKeys[i];
			if (!passKey) {
				break;
			}
			const passAccount = privateKeyToAccount(passKey);
			// spread the purchases around rather than piling them on one address
			const to = env.unnamedAccounts[i % env.unnamedAccounts.length];

			const signature = serializeSignature(
				await sign({
					hash: keccak256(
						encodePacked(['uint256', 'address'], [BigInt(i), to]),
					),
					privateKey: passKey,
				}),
			);

			await env.execute(sale, {
				account: deployer,
				functionName: 'mintWithSalePass',
				args: [
					nextId,
					to,
					BigInt(i),
					signature,
					tree.getProof(calculateHash(String(i), passAccount.address)),
				],
				value: PRICE,
			});
			nextId++;
		}

		const treasury = await env.viem.publicClient.getBalance({
			address: env.get('BleepsDAOAccount').address,
		});
		env.showMessage(
			`sale seeded: ${nextId} bought, ${RESERVED_IDS.length} reserved to the creator, ` +
				`treasury holds ${treasury} wei`,
		);
	},
	{
		tags: ['Bleeps_dev_setup'],
		dependencies: ['BleepsInitialSale_deploy'],
	},
);
