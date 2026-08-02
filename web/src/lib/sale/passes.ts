import {encodePacked, keccak256, serializeSignature} from 'viem';
import {privateKeyToAccount, sign} from 'viem/accounts';
import {
	MerkleTree,
	calculateHash,
	hashLeaves,
	type Hash,
	type SalePassLeaf,
} from 'bleeps-common';

/**
 * Sale passes, both kinds.
 *
 * The sale contract accepts two proofs of the same merkle tree, and they differ
 * in WHO the leaf commits to:
 *
 *   `mintWithPassId` proves a leaf of (passId, msg.sender). The pass belongs to
 *   an address, so only that address can spend it. Mainnet issued these to
 *   Mandala holders; the dev deploy issues one to every dev account.
 *
 *   `mintWithSalePass` proves a leaf of (passId, recovered signer), where the
 *   signature is over (passId, recipient). The pass IS a private key, so it can
 *   be handed to somebody as a link and redeemed from any account to any
 *   address. That is what makes it shareable, and it is also why the signature
 *   commits to the recipient: without that, whoever received the link could be
 *   front-run and the Bleep would land somewhere else.
 *
 * Everything here is pure except the two signing helpers, so what the app claims
 * about a pass can be tested without a chain.
 */

export type SalePass =
	| {kind: 'none'}
	| {kind: 'invalid'; message: string}
	| {kind: 'address-bound'; passId: number; signer: `0x${string}`}
	| {
			kind: 'transferable';
			passId: number;
			signer: `0x${string}`;
			privateKey: `0x${string}`;
	  };

/** A pass that can actually be presented to the contract. */
export type UsableSalePass = Extract<
	SalePass,
	{kind: 'address-bound'} | {kind: 'transferable'}
>;

export function isUsablePass(pass: SalePass): pass is UsableSalePass {
	return pass.kind === 'address-bound' || pass.kind === 'transferable';
}

function leafIndexFor(
	leaves: readonly SalePassLeaf[],
	signer: string,
): number | undefined {
	const index = leaves.findIndex(
		(leaf) => leaf.signer.toLowerCase() === signer.toLowerCase(),
	);
	return index < 0 ? undefined : index;
}

/**
 * Which pass this visitor has, if any.
 *
 * A pass key in the URL wins over the connected account's own pass: somebody who
 * followed a pass link is here to spend that pass, and it is the one that can be
 * spent from any account. An unusable key is reported rather than ignored, since
 * silently falling back would leave the user thinking their link worked.
 */
export function resolveSalePass(params: {
	leaves: readonly SalePassLeaf[];
	/** The connected account, when there is one. */
	account?: `0x${string}`;
	/** `#passKey=0x...`, the shareable half of a transferable pass. */
	passKey?: string;
}): SalePass {
	const {leaves, account, passKey} = params;

	if (passKey) {
		let signer: `0x${string}`;
		try {
			signer = privateKeyToAccount(passKey as `0x${string}`).address;
		} catch {
			return {kind: 'invalid', message: 'That pass key is not a valid key.'};
		}
		const passId = leafIndexFor(leaves, signer);
		if (passId === undefined) {
			return {
				kind: 'invalid',
				message: 'That pass key is not part of this sale.',
			};
		}
		return {
			kind: 'transferable',
			passId,
			signer,
			privateKey: passKey as `0x${string}`,
		};
	}

	if (account) {
		const passId = leafIndexFor(leaves, account);
		if (passId !== undefined) {
			return {kind: 'address-bound', passId, signer: account};
		}
	}

	return {kind: 'none'};
}

/**
 * The merkle proof for a pass.
 *
 * The tree is rebuilt from the leaves rather than stored, and memoised per
 * leaf-set: it is a few hundred hashes, and keeping it derived means the app
 * cannot drift from the deployment record it came from.
 */
const treeCache = new WeakMap<readonly SalePassLeaf[], MerkleTree>();

export function passTree(leaves: readonly SalePassLeaf[]): MerkleTree {
	const existing = treeCache.get(leaves);
	if (existing) {
		return existing;
	}
	const tree = new MerkleTree(hashLeaves([...leaves]));
	treeCache.set(leaves, tree);
	return tree;
}

export function passProof(
	leaves: readonly SalePassLeaf[],
	pass: UsableSalePass,
): Hash[] {
	return passTree(leaves).getProof(
		calculateHash(String(pass.passId), pass.signer),
	);
}

/**
 * The signature `mintWithSalePass` verifies: the pass key signing over
 * (passId, recipient), as a raw digest rather than an EIP-191 message, because
 * that is what the contract recovers.
 */
export async function salePassSignature(
	pass: Extract<SalePass, {kind: 'transferable'}>,
	to: `0x${string}`,
): Promise<`0x${string}`> {
	return serializeSignature(
		await sign({
			hash: keccak256(
				encodePacked(['uint256', 'address'], [BigInt(pass.passId), to]),
			),
			privateKey: pass.privateKey,
		}),
	);
}

/**
 * The signature the BOOKING service verifies, which is a different thing: an
 * EIP-191 message of the Bleep number, proving the booker holds the pass key
 * before a transaction exists. Address-bound passes have no key to sign with,
 * and the service does not ask them for one.
 */
export async function bookingSignature(
	pass: UsableSalePass,
	bleepId: number,
): Promise<string> {
	if (pass.kind !== 'transferable') {
		return '';
	}
	return privateKeyToAccount(pass.privateKey).signMessage({
		message: `${bleepId}`,
	});
}
