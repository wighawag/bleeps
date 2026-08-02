import {deployScript} from '../../rocketh/deploy.js';
import {encodePacked, keccak256, serializeSignature} from 'viem';
import {privateKeyToAccount, sign} from 'viem/accounts';
import {
	MerkleTree,
	calculateHash,
	hashLeaves,
	type SalePassLeaf,
} from 'bleeps-common';
import type {Abi_Bleeps} from '../../generated/abis/Bleeps.js';
import type {Abi_BleepsFixedPriceSale} from '../../generated/abis/BleepsFixedPriceSale.js';
import {devSaleMode} from '../dev-sale-mode.js';

/**
 * Put a dev chain into the state mainnet is in.
 *
 * The point is that the state is reached the way mainnet reached it, THROUGH the
 * sale, rather than minted into place. So the DAO treasury holds real proceeds,
 * the creator holds their real cut, and the Bleeps have owners who paid for
 * them.
 *
 * By default that means SOLD OUT, which is what bleeps.art actually is: the
 * creator takes the two reserved instruments, and the remaining 448 are bought
 * in the public phase. The app then shows browse mode without being told to.
 *
 * `BLEEPS_DEV_SALE=live` deploys the sale with its whitelist window open instead
 * (see ../dev-sale-mode.ts), and then this leaves most of the Bleeps unsold so
 * the buying flows stay reachable: every dev account redeems the pass bound to
 * its address, half the transferable passes are redeemed, and the rest are left
 * to try by hand.
 *
 * Which of the two happens is decided by the DEPLOYED SALE's own times, not by
 * the environment variable, so a seeding run can never contradict the sale it is
 * seeding: if the whitelist phase is still open, passes are the only way in and
 * selling out is impossible (there are ~80 passes and 448 Bleeps).
 */

/** Instruments 7 and 8, which only the creator can mint. */
const RESERVED_IDS = Array.from({length: 128}, (_, i) => 448 + i);

/** Instruments 0 to 6: everything the sale can actually sell. */
const PURCHASABLE_IDS = Array.from({length: 448}, (_, i) => i);

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

		// What the sale itself says, rather than what the environment asked for.
		const [price, , whitelistPrice, whitelistEndTime] = await env.read(sale, {
			functionName: 'priceInfo',
		});
		const latestBlock = await env.viem.publicClient.getBlock();
		const whitelistPhase = latestBlock.timestamp < whitelistEndTime;
		env.showMessage(
			`seeding a ${whitelistPhase ? 'live' : 'sold-out'} sale ` +
				`(asked for: ${devSaleMode((env.extra as {devSaleMode?: string} | undefined)?.devSaleMode)})`,
		);

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

		let nextId = 0;
		let bought = 0;

		if (whitelistPhase) {
			// 2. Each dev account buys one with the pass bound to its own address.
			//    A pass is single-use, so this is exactly one Bleep each.
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
					value: whitelistPrice,
				});
				nextId++;
				bought++;
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
					value: whitelistPrice,
				});
				nextId++;
				bought++;
			}
		} else {
			// 2'. The public phase needs no pass, so the sale can run to its end:
			//     every purchasable Bleep is bought, by a spread of accounts, and the
			//     collection sells out exactly as mainnet's did.
			for (const id of PURCHASABLE_IDS) {
				const to = env.unnamedAccounts[id % env.unnamedAccounts.length];
				await env.execute(sale, {
					account: to,
					functionName: 'mint',
					args: [id, to],
					value: price,
				});
				bought++;
			}
		}

		const treasury = await env.viem.publicClient.getBalance({
			address: env.get('BleepsDAOAccount').address,
		});
		env.showMessage(
			`sale seeded: ${bought} bought, ${RESERVED_IDS.length} reserved to the creator, ` +
				`treasury holds ${treasury} wei`,
		);
	},
	{
		tags: ['Bleeps_dev_setup'],
		dependencies: ['BleepsInitialSale_deploy'],
	},
);
