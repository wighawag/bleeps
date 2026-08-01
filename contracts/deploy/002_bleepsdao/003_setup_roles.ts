import {deployScript} from '../../rocketh/deploy.js';

/**
 * Hand the timelock over to the governor.
 *
 * The governor becomes the only proposer, and the deployer drops its admin
 * role, so from here on nothing reaches the treasury except through a vote.
 * Both steps are guarded so a re-run is a no-op.
 */
export default deployScript(
	async (env) => {
		const {deployer} = env.namedAccounts;

		const BleepsDAOAccount = env.get('BleepsDAOAccount');
		const BleepsDAOGovernor = env.get('BleepsDAOGovernor');

		const PROPOSER_ROLE = await env.read(BleepsDAOAccount, {
			functionName: 'PROPOSER_ROLE',
		});
		const TIMELOCK_ADMIN_ROLE = await env.read(BleepsDAOAccount, {
			functionName: 'TIMELOCK_ADMIN_ROLE',
		});

		const governorIsProposer = await env.read(BleepsDAOAccount, {
			functionName: 'hasRole',
			args: [PROPOSER_ROLE, BleepsDAOGovernor.address],
		});
		if (!governorIsProposer) {
			await env.execute(BleepsDAOAccount, {
				account: deployer,
				functionName: 'grantRole',
				args: [PROPOSER_ROLE, BleepsDAOGovernor.address],
			});
		}

		// Done last: once this is revoked the deployer cannot grant anything else.
		const deployerIsAdmin = await env.read(BleepsDAOAccount, {
			functionName: 'hasRole',
			args: [TIMELOCK_ADMIN_ROLE, deployer],
		});
		if (deployerIsAdmin) {
			await env.execute(BleepsDAOAccount, {
				account: deployer,
				functionName: 'revokeRole',
				args: [TIMELOCK_ADMIN_ROLE, deployer],
			});
		}
	},
	{
		tags: [
			'BleepsDAOAccount',
			'BleepsDAOGovernor',
			'BleepsDAOAccount_setup',
			'BleepsDAOGovernor_setup',
		],
		dependencies: ['BleepsDAOAccount_deploy', 'BleepsDAOGovernor_deploy'],
	},
);
