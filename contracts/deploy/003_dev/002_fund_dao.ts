import {deployScript} from '../../rocketh/deploy.js';
import {parseEther} from 'viem';

/**
 * Give the DAO treasury something to spend, on dev chains only.
 *
 * On mainnet the treasury filled up from sale proceeds. Any UI or proposal that
 * shows or moves the balance is untestable against zero, so put a comparable
 * amount in.
 */
export default deployScript(
	async (env) => {
		const {deployer} = env.namedAccounts;

		const BleepsDAOAccount = env.get('BleepsDAOAccount');

		const currentBalance = await env.viem.publicClient.getBalance({
			address: BleepsDAOAccount.address,
		});

		if (currentBalance > 0n) {
			env.showMessage('DAO treasury already funded');
			return;
		}

		await env.tx({
			account: deployer,
			to: BleepsDAOAccount.address,
			value: parseEther('33'),
		});
	},
	{
		tags: ['BleepsDAOAccount', 'Bleeps_dev_setup'],
		dependencies: ['BleepsDAOAccount_deploy'],
	},
);
