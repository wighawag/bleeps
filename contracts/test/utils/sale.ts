import type {EthereumProvider} from 'hardhat/types/providers';
import {encodePacked, keccak256, serializeSignature} from 'viem';
import {privateKeyToAccount, sign} from 'viem/accounts';
import {
	MerkleTree,
	calculateHash,
	hashLeaves,
	type Hash,
	type SalePassLeaf,
} from 'bleeps-common';
import {loadAndExecuteDeploymentsFromFiles} from '../../rocketh/environment.js';
import {saleTestScripts} from '../../rocketh/config.js';
import type {Abi_Bleeps} from '../../generated/abis/Bleeps.js';
import type {Abi_BleepsFixedPriceSale} from '../../generated/abis/BleepsFixedPriceSale.js';

export type SaleLinkedData = {
	leaves: SalePassLeaf[];
	privateKeys: `0x${string}`[];
	startTime: number;
	publicSaleTimestamp: number;
	price: string;
};

/** A deployed, untouched sale: every pass unused, every Bleep available. */
export function setupSaleFixtures(provider: EthereumProvider) {
	return {
		async deploySale() {
			const env = await loadAndExecuteDeploymentsFromFiles({
				provider,
				config: {scripts: [...saleTestScripts]},
			});

			const sale = env.get<Abi_BleepsFixedPriceSale>('BleepsInitialSale');
			const linkedData = sale.linkedData as SaleLinkedData;

			return {
				env,
				Bleeps: env.get<Abi_Bleeps>('Bleeps'),
				BleepsDAOAccount: env.get('BleepsDAOAccount'),
				sale,
				linkedData,
				tree: new MerkleTree(hashLeaves(linkedData.leaves)),
				namedAccounts: env.namedAccounts,
				unnamedAccounts: env.unnamedAccounts,
			};
		},
	};
}

export type SaleFixtures = Awaited<
	ReturnType<ReturnType<typeof setupSaleFixtures>['deploySale']>
>;

/** The pass issued to `account`, redeemable by that address only. */
export function addressBoundPass(
	{linkedData, tree}: Pick<SaleFixtures, 'linkedData' | 'tree'>,
	account: `0x${string}`,
): {passId: bigint; proof: Hash[]} {
	const passId = linkedData.leaves.findIndex(
		(leaf) => leaf.signer.toLowerCase() === account.toLowerCase(),
	);
	if (passId < 0) {
		throw new Error(`no address-bound pass for ${account}`);
	}
	return {
		passId: BigInt(passId),
		proof: tree.getProof(calculateHash(String(passId), account)),
	};
}

/**
 * A transferable pass, redeemed to `to`.
 *
 * The pass key signs over the RECIPIENT, not the sender, which is what lets a
 * pass be handed to somebody as a link and used from any account.
 */
export async function transferablePass(
	{linkedData, tree}: Pick<SaleFixtures, 'linkedData' | 'tree'>,
	index: number,
	to: `0x${string}`,
): Promise<{passId: bigint; signature: `0x${string}`; proof: Hash[]}> {
	const privateKey = linkedData.privateKeys[index];
	const passAccount = privateKeyToAccount(privateKey);
	const signature = serializeSignature(
		await sign({
			hash: keccak256(
				encodePacked(['uint256', 'address'], [BigInt(index), to]),
			),
			privateKey,
		}),
	);
	return {
		passId: BigInt(index),
		signature,
		proof: tree.getProof(calculateHash(String(index), passAccount.address)),
	};
}
