import {deployScript, artifacts} from '../../rocketh/deploy.js';

/**
 * The governor: Bleeps are the voting rights, BleepsDAOAccount is the executor.
 */
export default deployScript(
	async (env) => {
		const {deployer, daoVetoer} = env.namedAccounts;

		const Bleeps = env.get('Bleeps');
		const BleepsDAOAccount = env.get('BleepsDAOAccount');

		await env.deploy(
			'BleepsDAOGovernor',
			{
				account: deployer,
				artifact: artifacts.BleepsDAOGovernor,
				args: [Bleeps.address, BleepsDAOAccount.address, daoVetoer],
			},
			{skipIfAlreadyDeployed: true},
		);
	},
	{
		tags: ['BleepsDAOGovernor', 'BleepsDAOGovernor_deploy'],
		dependencies: ['Bleeps_deploy', 'BleepsDAOAccount_deploy'],
	},
);
