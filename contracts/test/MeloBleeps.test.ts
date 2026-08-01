import {expect} from 'earl';
import {describe, it} from 'node:test';
import {network} from 'hardhat';
import {encodePacked, keccak256} from 'viem';
import {setupFixtures, getEvent} from './utils/index.js';
import {ensureIsMeloBleepsMinter} from './utils/bleeps.js';
import {createData, exampleMelody} from './utils/melody.js';

const {provider, networkHelpers} = await network.create();
const {deployAll} = setupFixtures(provider);

/**
 * A connection whose RPC gas cap is raised to 50,000,000, which is geth's
 * default `--rpc.gascap`.
 *
 * Rendering a melody costs about 34M gas. That is over EIP-7825's 16,777,216
 * per-TRANSACTION cap, so no transaction can call it, but `eth_call` is bound by
 * node policy rather than consensus and 34M sits comfortably inside a normal
 * node's allowance. Wallets and marketplaces read tokenURI over eth_call, so the
 * metadata is readable in practice.
 *
 * EDR applies one limit to both, so a second connection is needed to model the
 * eth_call side. Nothing here is pretending the chain is old: the default
 * connection stays faithful to consensus.
 *
 * See docs/adr/0002-melobleeps-tokenuri-gas.md.
 */
const NODE_RPC_GAS_CAP = 50_000_000n;
const nodeLikeCap = await network.create({
	override: {
		transactionGasCap: NODE_RPC_GAS_CAP,
		blockGasLimit: NODE_RPC_GAS_CAP,
	} as never,
});
const nodeLikeCapFixtures = setupFixtures(nodeLikeCap.provider);

/** EIP-7825's per-transaction gas cap. */
const TRANSACTION_GAS_CAP = 16_777_216n;

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';
const ZERO_BYTES32 =
	'0x0000000000000000000000000000000000000000000000000000000000000000';

const SPEED = 16;

const {data1, data2} = createData(
	exampleMelody({vol: 7, note: 1, shape: 8}, {vol: 5, note: 63, shape: 6}),
);

function melodyHashOf(
	d1: `0x${string}`,
	d2: `0x${string}`,
	speed: number,
): `0x${string}` {
	return keccak256(
		encodePacked(['bytes32', 'bytes32', 'uint8'], [d1, d2, speed]),
	);
}

describe('MeloBleeps', function () {
	it('reserveAndReveal then mint', async function () {
		const fixtures = await networkHelpers.loadFixture(deployAll);
		const {env, MeloBleeps, unnamedAccounts} = fixtures;

		const artist = unnamedAccounts[1];
		// The auctions contract is the real minter; the test takes the role so it
		// can drive the melody lifecycle directly.
		await ensureIsMeloBleepsMinter(fixtures, artist);

		const receipt = await env.execute(MeloBleeps, {
			account: artist,
			functionName: 'reserveAndReveal',
			args: [artist, 'test', data1, data2, SPEED],
		});

		const reserved = getEvent(receipt, MeloBleeps.abi, 'MelodyReserved');
		expect(reserved.args.artist.toLowerCase()).toEqual(artist.toLowerCase());
		expect(reserved.args.melodyHash).toEqual(melodyHashOf(data1, data2, SPEED));
		const id = reserved.args.id as bigint;

		const revealed = getEvent(receipt, MeloBleeps.abi, 'MelodyRevealed');
		expect(revealed.args.id).toEqual(id);
		expect(revealed.args.name).toEqual('test');
		expect(revealed.args.speed).toEqual(SPEED);

		// Reserved and revealed, but not owned by anyone yet.
		expect(
			(
				await env.read(MeloBleeps, {functionName: 'creatorOf', args: [id]})
			).toLowerCase(),
		).toEqual(artist.toLowerCase());

		const mintReceipt = await env.execute(MeloBleeps, {
			account: artist,
			functionName: 'mint',
			args: [id, unnamedAccounts[1]],
		});
		const transfer = getEvent(mintReceipt, MeloBleeps.abi, 'Transfer');
		expect(transfer.args.from.toLowerCase()).toEqual(ZERO_ADDRESS);
		expect(transfer.args.to.toLowerCase()).toEqual(
			unnamedAccounts[1].toLowerCase(),
		);
		expect(transfer.args.tokenId).toEqual(id);
	});

	it('a name can only be used once', async function () {
		const fixtures = await networkHelpers.loadFixture(deployAll);
		const {env, MeloBleeps, unnamedAccounts} = fixtures;

		const artist = unnamedAccounts[1];
		await ensureIsMeloBleepsMinter(fixtures, artist);

		await env.execute(MeloBleeps, {
			account: artist,
			functionName: 'reserveAndReveal',
			args: [artist, 'unique', data1, data2, SPEED],
		});

		// A different melody, so only the name collides.
		const other = createData(
			exampleMelody({vol: 6, note: 2, shape: 5}, {vol: 4, note: 40, shape: 3}),
		);
		await expect(
			env.execute(MeloBleeps, {
				account: artist,
				functionName: 'reserveAndReveal',
				args: [artist, 'unique', other.data1, other.data2, SPEED],
			}),
		).toBeRejectedWith('NAME_ALREADY_TAKEN');
	});

	it('an unnamed melody is allowed, and does not reserve the empty name', async function () {
		const fixtures = await networkHelpers.loadFixture(deployAll);
		const {env, MeloBleeps, unnamedAccounts} = fixtures;

		const artist = unnamedAccounts[1];
		await ensureIsMeloBleepsMinter(fixtures, artist);

		const first = await env.execute(MeloBleeps, {
			account: artist,
			functionName: 'reserveAndReveal',
			args: [artist, '', data1, data2, SPEED],
		});
		expect(
			getEvent(first, MeloBleeps.abi, 'MelodyReserved').args.nameHash,
		).toEqual(ZERO_BYTES32);

		const other = createData(
			exampleMelody({vol: 6, note: 2, shape: 5}, {vol: 4, note: 40, shape: 3}),
		);
		await env.execute(MeloBleeps, {
			account: artist,
			functionName: 'reserveAndReveal',
			args: [artist, '', other.data1, other.data2, SPEED],
		});
	});

	it('speed zero is rejected', async function () {
		const fixtures = await networkHelpers.loadFixture(deployAll);
		const {env, MeloBleeps, unnamedAccounts} = fixtures;

		const artist = unnamedAccounts[1];
		await ensureIsMeloBleepsMinter(fixtures, artist);

		// speed doubles as the "has this been revealed" flag, so zero has to be
		// refused or a melody could be minted with no content.
		await expect(
			env.execute(MeloBleeps, {
				account: artist,
				functionName: 'reserveAndReveal',
				args: [artist, 'zero speed', data1, data2, 0],
			}),
		).toBeRejectedWith('INVALID_SPEED');
	});

	it('only the minter can reserve', async function () {
		const {env, MeloBleeps, unnamedAccounts} =
			await networkHelpers.loadFixture(deployAll);

		await expect(
			env.execute(MeloBleeps, {
				account: unnamedAccounts[5],
				functionName: 'reserveAndReveal',
				args: [unnamedAccounts[5], 'nope', data1, data2, SPEED],
			}),
		).toBeRejectedWith('ONLY_MINTER_ALLOWED');
	});

	it('cannot mint the same melody twice', async function () {
		const fixtures = await networkHelpers.loadFixture(deployAll);
		const {env, MeloBleeps, unnamedAccounts} = fixtures;

		const artist = unnamedAccounts[1];
		await ensureIsMeloBleepsMinter(fixtures, artist);

		const receipt = await env.execute(MeloBleeps, {
			account: artist,
			functionName: 'reserveRevealAndMint',
			args: [artist, 'once', data1, data2, SPEED, artist],
		});
		const id = getEvent(receipt, MeloBleeps.abi, 'MelodyReserved').args
			.id as bigint;

		await expect(
			env.execute(MeloBleeps, {
				account: artist,
				functionName: 'mint',
				args: [id, artist],
			}),
		).toBeRejectedWith('ALREADY_MINTED');
	});

	it('cannot mint a melody that was never reserved', async function () {
		const fixtures = await networkHelpers.loadFixture(deployAll);
		const {env, MeloBleeps, unnamedAccounts} = fixtures;

		const artist = unnamedAccounts[1];
		await ensureIsMeloBleepsMinter(fixtures, artist);

		await expect(
			env.execute(MeloBleeps, {
				account: artist,
				functionName: 'mint',
				args: [999n, artist],
			}),
		).toBeRejectedWith('NEED_RESERVATION');
	});
});

describe('MeloBleeps rendering', function () {
	it('tokenURI renders the melody as audio', async function () {
		const fixtures = await nodeLikeCap.networkHelpers.loadFixture(
			nodeLikeCapFixtures.deployAll,
		);
		const {env, MeloBleeps, unnamedAccounts} = fixtures;

		const artist = unnamedAccounts[1];
		await ensureIsMeloBleepsMinter(fixtures, artist);

		const receipt = await env.execute(MeloBleeps, {
			account: artist,
			functionName: 'reserveRevealAndMint',
			args: [artist, 'rendered', data1, data2, SPEED, artist],
		});
		const id = getEvent(receipt, MeloBleeps.abi, 'MelodyReserved').args
			.id as bigint;

		const tokenURI = await env.read(MeloBleeps, {
			functionName: 'tokenURI',
			args: [id],
		});
		expect(tokenURI.startsWith('data:application/json,')).toEqual(true);

		const metadata = JSON.parse(
			tokenURI.slice('data:application/json,'.length),
		);
		expect(metadata.name).toEqual('rendered');
		expect(metadata.animation_url.startsWith('data:audio/wav;base64,')).toEqual(
			true,
		);

		// Pin the cost and, with it, where this renderer can and cannot be used:
		// off-chain reads are fine, on-chain composability is not. If it ever drops
		// below the transaction cap that is worth knowing about, hence both bounds.
		const gas = await env.viem.publicClient.estimateContractGas({
			address: MeloBleeps.address,
			abi: MeloBleeps.abi,
			functionName: 'tokenURI',
			args: [id],
			account: artist,
		});
		expect(gas > TRANSACTION_GAS_CAP).toEqual(true);
		expect(gas < NODE_RPC_GAS_CAP).toEqual(true);
	});
});
