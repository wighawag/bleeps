import {deployScript} from '../../rocketh/deploy.js';
import type {Abi_Bleeps} from '../../generated/abis/Bleeps.js';

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';

const NUM_BLEEPS = 576;

/**
 * How many Bleeps to mint per transaction.
 *
 * All 576 used to go in one `multiMint`, which needed roughly 60M gas. That was
 * fine under hardhat 2, whose block gas limit we set to 50M and which had no
 * per-transaction cap. EIP-7825 caps a transaction at 2^24 = 16,777,216 gas, so
 * the single call now runs out of gas and the whole dev deploy fails.
 *
 * Bleeps are checkpointed, so each mint writes an owner slot and a voting
 * checkpoint: on the order of 100k gas. 48 per batch leaves plenty of room
 * under the cap even for the most expensive case (every mint going to a fresh
 * address), and divides 576 exactly.
 */
const MINTS_PER_TRANSACTION = 48;

/**
 * Put all 576 Bleeps in circulation, spread over the dev accounts.
 *
 * On mainnet this state was reached by the sale, which is over. Nothing here
 * simulates the sale mechanics; it reproduces its OUTCOME, which is what the
 * app and the DAO actually depend on: every Bleep owned by somebody, and
 * therefore every vote held by somebody. Without it a local chain has an empty
 * grid and a governor with zero total supply.
 *
 * Dev environments only, via the `devScripts` list in rocketh/config.ts.
 */
export default deployScript(
	async (env) => {
		const {deployer} = env.namedAccounts;

		// The first two unnamed accounts are left empty on purpose: the app needs
		// accounts that own nothing, to exercise the "you have no Bleeps" paths.
		const bleepers = env.unnamedAccounts.slice(2);
		if (bleepers.length === 0) {
			throw new Error(
				'no unnamed accounts to distribute Bleeps to; check the mnemonic and account count for this environment',
			);
		}

		const Bleeps = env.get<Abi_Bleeps>('Bleeps');

		const [ownerOfBleeps0] = await env.read(Bleeps, {
			functionName: 'owners',
			args: [[0n]],
		});
		if (ownerOfBleeps0 !== ZERO_ADDRESS) {
			env.showMessage('bleeps already distributed');
			return;
		}

		// multiMint is minter-only, so the deployer has to hold that role for the
		// duration. On a dev chain the minterAdmin is an account we control.
		const currentMinter = await env.read(Bleeps, {functionName: 'minter'});
		if (currentMinter.toLowerCase() !== deployer.toLowerCase()) {
			const currentMinterAdmin = await env.read(Bleeps, {
				functionName: 'minterAdmin',
			});
			await env.execute(Bleeps, {
				account: currentMinterAdmin,
				functionName: 'setMinter',
				args: [deployer],
			});
		}

		// Deal them out round-robin so the remainder is spread rather than dumped
		// on the last account.
		const perBleeper = Math.floor(NUM_BLEEPS / bleepers.length);
		const extra = NUM_BLEEPS - perBleeper * bleepers.length;

		// ids are uint16 on the contract, so plain numbers here
		const ids: number[] = [];
		const addresses: `0x${string}`[] = [];
		let bleepId = 0;
		for (let i = 0; i < bleepers.length; i++) {
			const count = perBleeper + (i < extra ? 1 : 0);
			for (let j = 0; j < count; j++) {
				ids.push(bleepId);
				addresses.push(bleepers[i]);
				bleepId++;
			}
		}

		for (let i = 0; i < ids.length; i += MINTS_PER_TRANSACTION) {
			await env.execute(Bleeps, {
				account: deployer,
				functionName: 'multiMint',
				args: [
					ids.slice(i, i + MINTS_PER_TRANSACTION),
					addresses.slice(i, i + MINTS_PER_TRANSACTION),
				],
			});
		}
	},
	{tags: ['Bleeps', 'Bleeps_dev_setup'], dependencies: ['Bleeps_deploy']},
);
