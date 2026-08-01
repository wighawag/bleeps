import {encodePacked, keccak256} from 'viem';
import {privateKeyToAccount} from 'viem/accounts';
import type {Hash} from './index.js';

/**
 * A sale pass leaf: the right for `signer` to claim pass number `passId`.
 *
 * The Bleeps sale is over on mainnet, so these only matter on dev chains, where
 * they let the original sale experience be replayed. See
 * docs/adr/0001-dev-only-sale-and-distribution.md.
 */
export type SalePassLeaf = {passId: string; signer: `0x${string}`};

export function calculateHash(passId: string, signer: `0x${string}`): Hash {
	return keccak256(
		encodePacked(['uint256', 'address'], [BigInt(passId), signer]),
	);
}

export function hashLeaves(data: SalePassLeaf[]): Hash[] {
	const hashedLeaves: Hash[] = [];

	for (let i = 0; i < data.length; i++) {
		hashedLeaves.push(calculateHash(data[i].passId, data[i].signer));
	}

	return hashedLeaves;
}

export function createLeavesFromMandalaOwners(
	startIndex: number,
	owners: {id: `0x${string}`; numMandalas: number}[],
): SalePassLeaf[] {
	const leaves: SalePassLeaf[] = [];

	for (let i = 0; i < owners.length; i++) {
		leaves.push({passId: '' + (startIndex + i), signer: owners[i].id});
	}

	return leaves;
}

/**
 * The private key behind dev sale pass number `index`.
 *
 * DERIVED, NOT RANDOM, AND THEREFORE PUBLIC. Anybody who can read this file can
 * compute every dev pass. That is the point: the mainnet sale is over, and on a
 * dev chain a pass is a thing you want to be able to regenerate at will rather
 * than a secret to look after. The original script generated random keys and
 * persisted them to a dotfile next to the deployment, which meant the sale could
 * not be reproduced from the repository alone.
 *
 * Never use this for a real sale. A real sale needs keys nobody else can derive.
 */
export function devSalePassPrivateKey(index: number): `0x${string}` {
	return keccak256(
		encodePacked(
			['string', 'uint256'],
			['bleeps dev sale pass', BigInt(index)],
		),
	);
}

export function createLeavesFromPrivateKeys(
	startIndex: number,
	privateKeys: `0x${string}`[],
): SalePassLeaf[] {
	const leaves: SalePassLeaf[] = [];

	for (let i = 0; i < privateKeys.length; i++) {
		const privateKey = privateKeys[i];
		leaves.push({
			passId: '' + (startIndex + i),
			signer: privateKeyToAccount(privateKey).address,
		});
	}

	return leaves;
}
