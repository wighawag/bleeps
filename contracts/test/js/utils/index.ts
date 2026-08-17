import type {EthereumProvider} from 'hardhat/types/providers';
import {parseEventLogs, type Abi} from 'viem';
import {loadAndExecuteDeploymentsFromFiles} from '../../../rocketh/environment.js';
import {testScripts} from '../../../rocketh/config.js';
import type {Abi_Bleeps} from '../../../generated/abis/Bleeps.js';
import type {Abi_BleepsDAOAccount} from '../../../generated/abis/BleepsDAOAccount.js';
import type {Abi_BleepsDAOGovernor} from '../../../generated/abis/BleepsDAOGovernor.js';
import type {Abi_MeloBleeps} from '../../../generated/abis/MeloBleeps.js';
import type {Abi_MeloBleepsAuctions} from '../../../generated/abis/MeloBleepsAuctions.js';
import type {Abi_MeloBleepsTokenURI} from '../../../generated/abis/MeloBleepsTokenURI.js';
import type {Abi_OpenSeaProxyRegistryMock} from '../../../generated/abis/OpenSeaProxyRegistryMock.js';

/**
 * Deploy everything the tests need: the real deploy scripts plus the dev mocks,
 * stopping short of the seeding in `003_dev`. See `testScripts`.
 */
export function setupFixtures(provider: EthereumProvider) {
	return {
		async deployAll() {
			const env = await loadAndExecuteDeploymentsFromFiles({
				provider,
				// Never touch deployments/: a test that persisted its deployment would
				// be reused by the next run against a different chain, making the suite
				// depend on whatever was last deployed on this machine.
				saveDeployments: false,
				config: {scripts: [...testScripts]},
			});

			return {
				env,
				Bleeps: env.get<Abi_Bleeps>('Bleeps'),
				BleepsDAOAccount: env.get<Abi_BleepsDAOAccount>('BleepsDAOAccount'),
				BleepsDAOGovernor: env.get<Abi_BleepsDAOGovernor>('BleepsDAOGovernor'),
				MeloBleeps: env.get<Abi_MeloBleeps>('MeloBleeps'),
				MeloBleepsAuctions:
					env.get<Abi_MeloBleepsAuctions>('MeloBleepsAuctions'),
				MeloBleepsTokenURI:
					env.get<Abi_MeloBleepsTokenURI>('MeloBleepsTokenURI'),
				WyvernProxyRegistry: env.get<Abi_OpenSeaProxyRegistryMock>(
					'WyvernProxyRegistry',
				),
				namedAccounts: env.namedAccounts,
				unnamedAccounts: env.unnamedAccounts,
			};
		},
	};
}

export type Fixtures = Awaited<
	ReturnType<ReturnType<typeof setupFixtures>['deployAll']>
>;

/**
 * Find one decoded event in a receipt, failing loudly if it is not there.
 *
 * The old suite used chai's `.to.emit(...).withArgs(...)`. There is no direct
 * equivalent here, and asserting on the decoded args explicitly is clearer
 * about what is actually being checked.
 */
export function getEvent<TAbi extends Abi, TName extends string>(
	receipt: {
		logs: readonly {address: string; topics: readonly string[]; data: string}[];
	},
	abi: TAbi,
	eventName: TName,
): any {
	const events = parseEventLogs({
		abi,
		eventName: eventName as any,
		logs: receipt.logs as any,
	});
	if (events.length === 0) {
		throw new Error(`no '${eventName}' event in this receipt`);
	}
	return events[0];
}

/**
 * The total supply, and the id of every Bleep. Fixed by the contract: 64 notes
 * across 9 instruments.
 */
export const NUM_BLEEPS = 576;
