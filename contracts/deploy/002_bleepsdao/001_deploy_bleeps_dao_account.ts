import {deployScript, artifacts} from '../../rocketh/deploy.js';

/**
 * The DAO's treasury and executor: an OpenZeppelin TimelockController that
 * holds the funds and enacts whatever the governor passes.
 */
export default deployScript(
	async (env) => {
		const {deployer, daoGuardian} = env.namedAccounts;

		await env.deploy(
			'BleepsDAOAccount',
			{
				account: deployer,
				artifact: artifacts.BleepsDAOAccount,
				args: [BigInt(env.data.minTimelockDelay), daoGuardian],
			},
			{skipIfAlreadyDeployed: true},
		);
	},
	{tags: ['BleepsDAOAccount', 'BleepsDAOAccount_deploy']},
);
