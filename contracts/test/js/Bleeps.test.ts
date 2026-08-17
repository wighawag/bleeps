import {expect} from 'earl';
import {describe, it} from 'node:test';
import {network} from 'hardhat';
import {setupFixtures, getEvent} from './utils/index.js';
import {mintViaMinterAdmin} from './utils/bleeps.js';

const {provider, networkHelpers} = await network.create();
const {deployAll} = setupFixtures(provider);

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';

describe('Bleeps', function () {
	it('supportsInterface', async function () {
		const {env, Bleeps} = await networkHelpers.loadFixture(deployAll);

		const supports = (id: `0x${string}`) =>
			env.read(Bleeps, {functionName: 'supportsInterface', args: [id]});

		expect(await supports('0x01ffc9a7')).toEqual(true); // ERC165
		expect(await supports('0x80ac58cd')).toEqual(true); // ERC721
		expect(await supports('0x5b5e139f')).toEqual(true); // ERC721Metadata
		expect(await supports('0x2a55205a')).toEqual(true); // ERC2981 royalties
		expect(await supports('0x00000000')).toEqual(false);
		expect(await supports('0x11111111')).toEqual(false);
	});

	it('opensea proxy works', async function () {
		const fixtures = await networkHelpers.loadFixture(deployAll);
		const {env, Bleeps, WyvernProxyRegistry, unnamedAccounts} = fixtures;

		await mintViaMinterAdmin(
			fixtures,
			1,
			unnamedAccounts[0],
			unnamedAccounts[0],
		);

		// Once user 1 is user 0's registered proxy, it can move user 0's tokens
		// without an explicit approval. This is the OpenSea listing path.
		await env.execute(WyvernProxyRegistry, {
			account: unnamedAccounts[0],
			functionName: 'setProxy',
			args: [unnamedAccounts[1]],
		});
		await env.execute(Bleeps, {
			account: unnamedAccounts[1],
			functionName: 'transferFrom',
			args: [unnamedAccounts[0], unnamedAccounts[2], 1n],
		});

		const owner = await env.read(Bleeps, {
			functionName: 'ownerOf',
			args: [1n],
		});
		expect(owner.toLowerCase()).toEqual(unnamedAccounts[2].toLowerCase());
	});

	it('opensea proxy works: fails when not set', async function () {
		const fixtures = await networkHelpers.loadFixture(deployAll);
		const {env, Bleeps, unnamedAccounts} = fixtures;

		await mintViaMinterAdmin(
			fixtures,
			1,
			unnamedAccounts[0],
			unnamedAccounts[0],
		);

		await expect(
			env.execute(Bleeps, {
				account: unnamedAccounts[1],
				functionName: 'transferFrom',
				args: [unnamedAccounts[0], unnamedAccounts[2], 1n],
			}),
		).toBeRejectedWith('UNAUTHORIZED_TRANSFER');
	});

	it('tokenURI works', async function () {
		const {env, Bleeps} = await networkHelpers.loadFixture(deployAll);

		const note = 3;
		const instrument = 2;
		const tokenId = BigInt(note + instrument * 64);

		// The whole point of Bleeps is that the sound is generated on chain, so
		// this asserts the renderer actually produces a data URI with audio in it
		// rather than merely not reverting.
		const tokenURI = await env.read(Bleeps, {
			functionName: 'tokenURI',
			args: [tokenId],
		});
		expect(tokenURI.startsWith('data:application/json,')).toEqual(true);

		const metadata = JSON.parse(
			tokenURI.slice('data:application/json,'.length),
		);
		expect(typeof metadata.name).toEqual('string');
		expect(metadata.animation_url.startsWith('data:audio/wav;base64,')).toEqual(
			true,
		);
	});

	it('contractURI works', async function () {
		const {env, Bleeps} = await networkHelpers.loadFixture(deployAll);

		const contractURI = await env.read(Bleeps, {
			functionName: 'contractURI',
		});
		expect(contractURI.startsWith('data:application/json,')).toEqual(true);
		JSON.parse(contractURI.slice('data:application/json,'.length));
	});

	it('minting works', async function () {
		const fixtures = await networkHelpers.loadFixture(deployAll);
		const {env, Bleeps, unnamedAccounts} = fixtures;

		const note = 3;
		const instrument = 2;
		const tokenId = BigInt(note + instrument * 64);

		await mintViaMinterAdmin(
			fixtures,
			tokenId,
			unnamedAccounts[0],
			unnamedAccounts[0],
		);

		const owner = await env.read(Bleeps, {
			functionName: 'ownerOf',
			args: [tokenId],
		});
		expect(owner.toLowerCase()).toEqual(unnamedAccounts[0].toLowerCase());
	});

	it('minting emits Transfer from the zero address', async function () {
		const fixtures = await networkHelpers.loadFixture(deployAll);
		const {env, Bleeps, unnamedAccounts} = fixtures;

		// mint directly here rather than through the helper, so we get the receipt
		const minterAdmin = await env.read(Bleeps, {
			functionName: 'minterAdmin',
		});
		await env.execute(Bleeps, {
			account: minterAdmin,
			functionName: 'setMinter',
			args: [unnamedAccounts[0]],
		});
		const receipt = await env.execute(Bleeps, {
			account: unnamedAccounts[0],
			functionName: 'mint',
			args: [7n, unnamedAccounts[1]],
		});

		const event = getEvent(receipt, Bleeps.abi, 'Transfer');
		expect(event.args.from.toLowerCase()).toEqual(ZERO_ADDRESS);
		expect(event.args.to.toLowerCase()).toEqual(
			unnamedAccounts[1].toLowerCase(),
		);
		expect(event.args.tokenId).toEqual(7n);
	});

	it('cannot mint the same Bleep twice', async function () {
		const fixtures = await networkHelpers.loadFixture(deployAll);
		const {env, Bleeps, unnamedAccounts} = fixtures;

		await mintViaMinterAdmin(
			fixtures,
			1,
			unnamedAccounts[0],
			unnamedAccounts[0],
		);

		await expect(
			env.execute(Bleeps, {
				account: unnamedAccounts[0],
				functionName: 'mint',
				args: [1n, unnamedAccounts[1]],
			}),
		).toBeRejected();
	});

	it('only the minter can mint', async function () {
		const {env, Bleeps, unnamedAccounts} =
			await networkHelpers.loadFixture(deployAll);

		await expect(
			env.execute(Bleeps, {
				account: unnamedAccounts[5],
				functionName: 'mint',
				args: [1n, unnamedAccounts[5]],
			}),
		).toBeRejectedWith('ONLY_MINTER_ALLOWED');
	});
});
