import {deployScript, artifacts} from '../../rocketh/deploy.js';
import {getWETHAddress} from '../utils.js';
import type {Abi_MeloBleeps} from '../../generated/abis/MeloBleeps.js';

/**
 * The auction house, and the only thing allowed to mint a MeloBleep.
 *
 * Proceeds are split between the Bleeps owners whose notes the melody uses and
 * the DAO treasury, which is why it needs all four addresses.
 */
export default deployScript(
	async (env) => {
		const {deployer} = env.namedAccounts;

		const Bleeps = env.get('Bleeps');
		const MeloBleeps = env.get<Abi_MeloBleeps>('MeloBleeps');
		const BleepsDAOAccount = env.get('BleepsDAOAccount');
		const weth = getWETHAddress(env);

		const MeloBleepsAuctions = await env.deploy(
			'MeloBleepsAuctions',
			{
				account: deployer,
				artifact: artifacts.MeloBleepsAuctions,
				args: [
					weth,
					Bleeps.address,
					MeloBleeps.address,
					BleepsDAOAccount.address,
				],
			},
			{skipIfAlreadyDeployed: true},
		);

		const currentMinter = await env.read(MeloBleeps, {
			functionName: 'minter',
		});
		if (
			currentMinter?.toLowerCase() !== MeloBleepsAuctions.address.toLowerCase()
		) {
			const minterAdmin = await env.read(MeloBleeps, {
				functionName: 'minterAdmin',
			});
			await env.execute(MeloBleeps, {
				account: minterAdmin,
				functionName: 'setMinter',
				args: [MeloBleepsAuctions.address],
			});
		}
	},
	{
		tags: ['MeloBleepsAuctions', 'MeloBleepsAuctions_deploy'],
		dependencies: [
			'Bleeps_deploy',
			'BleepsDAOAccount_deploy',
			'MeloBleeps_deploy',
		],
	},
);
