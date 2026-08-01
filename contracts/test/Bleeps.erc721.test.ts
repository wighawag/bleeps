import {erc721, type TestToRun} from 'ethereum-contracts-test-suite';
import {checksumAddress} from 'viem';
import {describe, it} from 'node:test';
import {network} from 'hardhat';
import {setupFixtures} from './utils/index.js';
import {mintViaMinterAdmin} from './utils/bleeps.js';

const {provider, networkHelpers} = await network.create();
const {deployAll} = setupFixtures(provider);

/**
 * The standard ERC721 conformance suite.
 *
 * Bleeps has no burn, and its ids are fixed (0..575, note + instrument * 64)
 * rather than freely chosen, so the suite hands out consecutive ids.
 */
const tests = erc721.generateTests({burn: false}, async () => {
	const fixtures = await networkHelpers.loadFixture(deployAll);
	const {env, Bleeps} = fixtures;

	let nextTokenId = 0;
	async function mint(to: string): Promise<{hash: string; tokenId: string}> {
		const tokenId = nextTokenId;
		nextTokenId++;
		const minter = env.namedAccounts.deployer;
		await mintViaMinterAdmin(fixtures, tokenId, minter, to as `0x${string}`);
		// mintViaMinterAdmin does not surface the receipt, and the suite only uses
		// the hash for logging, so re-read it is not worth a second round trip.
		return {tokenId: '' + tokenId, hash: ''};
	}

	return {
		ethereum: env.network.provider,
		contractAddress: Bleeps.address,
		// the suite compares addresses as strings, and expects them checksummed
		users: env.unnamedAccounts.map((v) => checksumAddress(v)),
		mint,
		deployer: checksumAddress(env.namedAccounts.deployer),
	};
});

/**
 * Suite tests that cannot run against Bleeps, and why.
 *
 * Bleeps is checkpointed, so a transfer emits two `DelegateVotesChanged` events
 * as well as `Transfer`. These six suite tests count the events in the receipt
 * using `log.fragment.name` against an ERC721-only ABI, so the extra logs
 * decode to `undefined` and the filter throws before it can assert anything.
 *
 * It is inconsistent within the suite itself: the plain `transferFrom` version
 * of the same assertion uses `log.fragment?.name` and passes. So this is an
 * upstream bug in ethereum-contracts-test-suite (0.2.6), not a property of
 * Bleeps, and the fix belongs there. Listed by exact title so that a fixed
 * release makes them start running again rather than staying quietly skipped.
 */
const UNRUNNABLE_AGAINST_A_CHECKPOINTED_TOKEN = new Set([
	'mint result in a transfer from 0 event',
	'safe transfering one NFT results in one erc721 transfer event',
	'data:0x : safe transfering one NFT results in one erc721 transfer event',
	'data:0xff56fe3422 : safe transfering one NFT results in one erc721 transfer event',
	'transfering the approved NFT results in aproval reset for it but no approval event',
	'safe transfering the approved NFT results in aproval reset for it but no approval event',
]);

function generateTest(test: TestToRun) {
	if (test.test) {
		if (UNRUNNABLE_AGAINST_A_CHECKPOINTED_TOKEN.has(test.title)) {
			it.skip(test.title, test.test);
		} else {
			it(test.title, test.test);
		}
	}
	const subTests = test.subTests;
	if (subTests) {
		describe(test.title, () => {
			for (const childTest of subTests) {
				generateTest(childTest);
			}
		});
	}
}

describe('Bleeps ERC721', () => {
	for (const test of tests) {
		generateTest(test);
	}
});
