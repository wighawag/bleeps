import type {Fixtures} from './index.js';

/**
 * Mint a Bleep directly, bypassing any sale.
 *
 * The sale contracts are not part of the deploy graph any more (the mainnet
 * sale is over, see docs/adr/0001-dev-only-sale-and-distribution.md), so tests
 * that just need somebody to own a token take the minter route. `minterAdmin`
 * can appoint any minter, so the test appoints itself and mints.
 */
export async function mintViaMinterAdmin(
	{env, Bleeps}: Pick<Fixtures, 'env' | 'Bleeps'>,
	tokenId: number | bigint,
	from: `0x${string}`,
	to: `0x${string}`,
): Promise<void> {
	await ensureMinter({env, Bleeps}, from);
	await env.execute(Bleeps, {
		account: from,
		functionName: 'mint',
		args: [BigInt(tokenId), to],
	});
}

export async function mintMultipleViaMinterAdmin(
	{env, Bleeps}: Pick<Fixtures, 'env' | 'Bleeps'>,
	tokenIds: (number | bigint)[],
	from: `0x${string}`,
	tos: `0x${string}`[],
): Promise<void> {
	await ensureMinter({env, Bleeps}, from);
	await env.execute(Bleeps, {
		account: from,
		functionName: 'multiMint',
		args: [tokenIds.map((id) => BigInt(id)), tos],
	});
}

async function ensureMinter(
	{env, Bleeps}: Pick<Fixtures, 'env' | 'Bleeps'>,
	minter: `0x${string}`,
): Promise<void> {
	const currentMinter = await env.read(Bleeps, {functionName: 'minter'});
	if (currentMinter.toLowerCase() === minter.toLowerCase()) {
		return;
	}
	const minterAdmin = await env.read(Bleeps, {functionName: 'minterAdmin'});
	await env.execute(Bleeps, {
		account: minterAdmin,
		functionName: 'setMinter',
		args: [minter],
	});
}

export async function ensureIsMeloBleepsMinter(
	{env, MeloBleeps}: Pick<Fixtures, 'env' | 'MeloBleeps'>,
	minter: `0x${string}`,
): Promise<void> {
	const currentMinter = await env.read(MeloBleeps, {functionName: 'minter'});
	if (currentMinter.toLowerCase() === minter.toLowerCase()) {
		return;
	}
	const minterAdmin = await env.read(MeloBleeps, {
		functionName: 'minterAdmin',
	});
	await env.execute(MeloBleeps, {
		account: minterAdmin,
		functionName: 'setMinter',
		args: [minter],
	});
}
