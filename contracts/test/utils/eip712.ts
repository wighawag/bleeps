import type {WalletClient} from 'viem';

/**
 * The EIP-712 types Bleeps signs.
 *
 * The domain deliberately has no `version`: the contract's DOMAIN_SEPARATOR is
 * built from name, chainId and verifyingContract only, and adding a field here
 * would silently produce signatures the contract rejects.
 */
export const PERMIT_TYPES = {
	Permit: [
		{name: 'spender', type: 'address'},
		{name: 'tokenId', type: 'uint256'},
		{name: 'nonce', type: 'uint256'},
		{name: 'deadline', type: 'uint256'},
	],
} as const;

export const PERMIT_FOR_ALL_TYPES = {
	PermitForAll: [
		{name: 'spender', type: 'address'},
		{name: 'nonce', type: 'uint256'},
		{name: 'deadline', type: 'uint256'},
	],
} as const;

export const DELEGATION_TYPES = {
	Delegation: [
		{name: 'delegatee', type: 'address'},
		{name: 'nonce', type: 'uint256'},
		{name: 'expiry', type: 'uint256'},
	],
} as const;

export function bleepsDomain(
	chainId: number,
	verifyingContract: `0x${string}`,
) {
	return {
		name: 'Bleeps',
		chainId,
		verifyingContract,
	} as const;
}

export type Signature = {
	signature: `0x${string}`;
	v: number;
	r: `0x${string}`;
	s: `0x${string}`;
};

/** Split a 65-byte signature into v, r, s, as the checkpointing API wants. */
export function splitSignature(signature: `0x${string}`): Signature {
	const body = signature.slice(2);
	if (body.length !== 130) {
		throw new Error(`expected a 65 byte signature, got ${body.length / 2}`);
	}
	const r = `0x${body.slice(0, 64)}` as `0x${string}`;
	const s = `0x${body.slice(64, 128)}` as `0x${string}`;
	let v = parseInt(body.slice(128, 130), 16);
	// Some signers still return 0/1 rather than 27/28.
	if (v < 27) {
		v += 27;
	}
	return {signature, v, r, s};
}

export async function signPermit(
	walletClient: WalletClient,
	account: `0x${string}`,
	chainId: number,
	bleeps: `0x${string}`,
	message: {
		spender: `0x${string}`;
		tokenId: bigint;
		nonce: bigint;
		deadline: bigint;
	},
): Promise<`0x${string}`> {
	return walletClient.signTypedData({
		account,
		domain: bleepsDomain(chainId, bleeps),
		types: PERMIT_TYPES,
		primaryType: 'Permit',
		message,
	});
}

export async function signPermitForAll(
	walletClient: WalletClient,
	account: `0x${string}`,
	chainId: number,
	bleeps: `0x${string}`,
	message: {spender: `0x${string}`; nonce: bigint; deadline: bigint},
): Promise<`0x${string}`> {
	return walletClient.signTypedData({
		account,
		domain: bleepsDomain(chainId, bleeps),
		types: PERMIT_FOR_ALL_TYPES,
		primaryType: 'PermitForAll',
		message,
	});
}

export async function signDelegation(
	walletClient: WalletClient,
	account: `0x${string}`,
	chainId: number,
	bleeps: `0x${string}`,
	message: {delegatee: `0x${string}`; nonce: bigint; expiry: bigint},
): Promise<Signature> {
	const signature = await walletClient.signTypedData({
		account,
		domain: bleepsDomain(chainId, bleeps),
		types: DELEGATION_TYPES,
		primaryType: 'Delegation',
		message,
	});
	return splitSignature(signature);
}
