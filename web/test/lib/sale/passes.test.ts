import {describe, expect, it} from 'vitest';
import {encodePacked, keccak256, recoverAddress, verifyMessage} from 'viem';
import {privateKeyToAccount} from 'viem/accounts';
import {
	calculateHash,
	devSalePassPrivateKey,
	type SalePassLeaf,
} from 'bleeps-common';
import {
	bookingSignature,
	passProof,
	passTree,
	resolveSalePass,
	salePassSignature,
} from '$lib/sale/passes';

const ACCOUNT = '0x1111111111111111111111111111111111111111';
const STRANGER = '0x2222222222222222222222222222222222222222';

/** The dev sale's shape: transferable pass keys first, then address-bound. */
const KEYS = [0, 1, 2].map((i) => devSalePassPrivateKey(i));
const leaves: SalePassLeaf[] = [
	...KEYS.map((key, i) => ({
		passId: String(i),
		signer: privateKeyToAccount(key).address,
	})),
	{passId: '3', signer: ACCOUNT},
];

describe('resolveSalePass', () => {
	it('gives a connected account the pass bound to its address', () => {
		expect(resolveSalePass({leaves, account: ACCOUNT})).toEqual({
			kind: 'address-bound',
			passId: 3,
			signer: ACCOUNT,
		});
	});

	it('has nothing for an account nobody issued a pass to', () => {
		expect(resolveSalePass({leaves, account: STRANGER})).toEqual({
			kind: 'none',
		});
	});

	it('reads a pass key from the link', () => {
		const pass = resolveSalePass({leaves, passKey: KEYS[1]});
		expect(pass).toMatchObject({kind: 'transferable', passId: 1});
	});

	it('prefers the link over the account, since that is what was followed', () => {
		// somebody arriving with a pass link means to spend that pass, and it is
		// the one that can be spent from any account
		const pass = resolveSalePass({
			leaves,
			account: ACCOUNT,
			passKey: KEYS[0],
		});
		expect(pass).toMatchObject({kind: 'transferable', passId: 0});
	});

	it('says so when a pass key is not part of this sale', () => {
		const stranger = devSalePassPrivateKey(99);
		expect(resolveSalePass({leaves, passKey: stranger})).toMatchObject({
			kind: 'invalid',
		});
	});

	it('says so when a pass key is not a key at all', () => {
		expect(resolveSalePass({leaves, passKey: 'not-a-key'})).toMatchObject({
			kind: 'invalid',
		});
	});
});

describe('passProof', () => {
	it('proves the leaf the contract will compute for an address-bound pass', () => {
		// the contract hashes (passId, msg.sender) and checks the proof against
		// the root, so the proof has to be for exactly that leaf
		const pass = resolveSalePass({leaves, account: ACCOUNT});
		if (pass.kind !== 'address-bound') throw new Error('expected a pass');
		const proof = passProof(leaves, pass);
		expect(
			passTree(leaves).isDataValid(calculateHash('3', ACCOUNT), proof),
		).toBe(true);
	});
});

describe('salePassSignature', () => {
	it('signs (passId, recipient) as a raw digest, which is what the sale recovers', async () => {
		const pass = resolveSalePass({leaves, passKey: KEYS[2]});
		if (pass.kind !== 'transferable') throw new Error('expected a pass');

		const signature = await salePassSignature(pass, ACCOUNT);
		const recovered = await recoverAddress({
			hash: keccak256(
				encodePacked(['uint256', 'address'], [BigInt(pass.passId), ACCOUNT]),
			),
			signature,
		});
		expect(recovered.toLowerCase()).toEqual(pass.signer.toLowerCase());
	});

	it('binds the signature to the recipient, so a pass link cannot be stolen in flight', async () => {
		const pass = resolveSalePass({leaves, passKey: KEYS[2]});
		if (pass.kind !== 'transferable') throw new Error('expected a pass');

		const signature = await salePassSignature(pass, ACCOUNT);
		const recovered = await recoverAddress({
			hash: keccak256(
				encodePacked(['uint256', 'address'], [BigInt(pass.passId), STRANGER]),
			),
			signature,
		});
		expect(recovered.toLowerCase()).not.toEqual(pass.signer.toLowerCase());
	});
});

describe('bookingSignature', () => {
	it('signs the Bleep number as a message, which is what the service checks', async () => {
		const pass = resolveSalePass({leaves, passKey: KEYS[0]});
		if (pass.kind !== 'transferable') throw new Error('expected a pass');

		const signature = await bookingSignature(pass, 42);
		expect(
			await verifyMessage({
				address: pass.signer,
				message: '42',
				signature: signature as `0x${string}`,
			}),
		).toBe(true);
	});

	it('is empty for an address-bound pass, which has no key to sign with', async () => {
		const pass = resolveSalePass({leaves, account: ACCOUNT});
		if (pass.kind !== 'address-bound') throw new Error('expected a pass');
		expect(await bookingSignature(pass, 42)).toEqual('');
	});
});
