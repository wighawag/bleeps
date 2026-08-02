import {expect} from 'earl';
import {describe, it} from 'node:test';
import {network} from 'hardhat';
import {loadAndExecuteDeploymentsFromFiles} from '../rocketh/environment.js';
import {devScripts} from '../rocketh/config.js';
import type {Abi_Bleeps} from '../generated/abis/Bleeps.js';
import type {Abi_BleepsFixedPriceSale} from '../generated/abis/BleepsFixedPriceSale.js';

/**
 * What a dev chain looks like after `deploy/004_dev_seed`.
 *
 * The point of these two is the DEFAULT. A dev chain is meant to reproduce what
 * mainnet is, which is sold out, so the web app lands in browse mode without a
 * flag; a live sale is the thing you opt into. Both states are reached through
 * the sale, so this also pins that the sale itself still works end to end.
 *
 * See docs/adr/0001-dev-only-sale-and-distribution.md.
 */

const {provider} = await network.create();

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';
const ALL_IDS = Array.from({length: 576}, (_, i) => BigInt(i));
/** Instruments 0 to 6: what the sale can sell. */
const PURCHASABLE = 448;

async function seed(mode?: 'live' | 'sold-out') {
	const env = await loadAndExecuteDeploymentsFromFiles({
		provider,
		// Never touch deployments/: see test/utils/sale.ts.
		saveDeployments: false,
		config: {scripts: [...devScripts]},
		...(mode ? {extra: {devSaleMode: mode}} : {}),
	});
	const Bleeps = env.get<Abi_Bleeps>('Bleeps');
	const owners = await env.read(Bleeps, {
		functionName: 'owners',
		args: [ALL_IDS],
	});
	return {env, Bleeps, owners};
}

function unowned(owners: readonly string[], from: number, to: number): number {
	let count = 0;
	for (let id = from; id < to; id++) {
		if (owners[id].toLowerCase() === ZERO_ADDRESS) {
			count++;
		}
	}
	return count;
}

describe('the dev seeding', function () {
	it('sells out by default, which is the state mainnet is in', async function () {
		const {env, owners} = await seed();

		expect(unowned(owners, 0, 576)).toEqual(0);

		// Bought, not minted into place: the proceeds are real and in the DAO.
		const treasury = await env.viem.publicClient.getBalance({
			address: env.get('BleepsDAOAccount').address,
		});
		expect(treasury > 0n).toEqual(true);
	});

	it('leaves a sale to run when asked for a live one', async function () {
		const {env, owners} = await seed('live');

		// The reserved instruments are the creator's either way.
		expect(unowned(owners, 448, 576)).toEqual(0);

		const left = unowned(owners, 0, PURCHASABLE);
		expect(left > 0).toEqual(true);
		expect(left < PURCHASABLE).toEqual(true);

		// The pass-gated phase is what makes it a live sale, and the seeding went
		// through it: some passes are genuinely spent.
		const sale = env.get<Abi_BleepsFixedPriceSale>('BleepsInitialSale');
		expect(
			await env.read(sale, {functionName: 'isPassUsed', args: [0n]}),
		).toEqual(true);
	});
});
