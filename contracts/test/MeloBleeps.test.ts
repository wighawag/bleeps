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
 * A connection to a pre-Fusaka EVM, used only to exercise the on-chain
 * renderer.
 *
 * MeloBleeps' tokenURI needs ~34M gas, and EIP-7825 caps a transaction at
 * 2^24 = 16,777,216 gas, so on a current EVM the renderer cannot run at all.
 * That is pinned by the test at the bottom of this file. Its OUTPUT is still
 * worth testing, though, so the rendering test runs against an EVM old enough
 * to let it execute.
 *
 * See docs/adr/0002-melobleeps-tokenuri-exceeds-the-gas-cap.md.
 */
const preGasCap = await network.create({override: {hardfork: 'prague'}});
const preGasCapFixtures = setupFixtures(preGasCap.provider);

/** EIP-7825's per-transaction gas cap. */
const TRANSACTION_GAS_CAP = 16_777_216;

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

	it('tokenURI is not callable on a current EVM', async function () {
		const fixtures = await networkHelpers.loadFixture(deployAll);
		const {env, MeloBleeps, unnamedAccounts} = fixtures;

		const artist = unnamedAccounts[1];
		await ensureIsMeloBleepsMinter(fixtures, artist);

		const receipt = await env.execute(MeloBleeps, {
			account: artist,
			functionName: 'reserveRevealAndMint',
			args: [artist, 'too expensive', data1, data2, SPEED, artist],
		});
		const id = getEvent(receipt, MeloBleeps.abi, 'MelodyReserved').args
			.id as bigint;

		// This assertion is deliberately the wrong way round: it pins a defect.
		// Rendering a melody costs about 34M gas, twice EIP-7825's 16,777,216 cap,
		// so on mainnet or Sepolia today nothing can call it in a transaction.
		// Fixing the renderer will make this test fail; delete it then.
		await expect(
			env.read(MeloBleeps, {functionName: 'tokenURI', args: [id]}),
		).toBeRejectedWith('out of gas');
	});
});

describe('MeloBleeps rendering (pre-EIP-7825 EVM)', function () {
	it('tokenURI renders the melody as audio', async function () {
		const fixtures = await preGasCap.networkHelpers.loadFixture(
			preGasCapFixtures.deployAll,
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

		// The number that matters: what it would cost if it could be called.
		const gas = await env.viem.publicClient.estimateContractGas({
			address: MeloBleeps.address,
			abi: MeloBleeps.abi,
			functionName: 'tokenURI',
			args: [id],
			account: artist,
		});
		expect(gas > BigInt(TRANSACTION_GAS_CAP)).toEqual(true);
	});
});
