import {execute} from 'rocketh';
import 'rocketh-deploy';
import {context} from '../_context';

export default execute(
	context,
	async ({deploy, accounts, artifacts}) => {
		await deploy(
			'WETH',
			{
				account: accounts.deployer,
				artifact: artifacts.WETH9,
			}, {
        skipIfAlreadyDeployed: true
      }
		);
	},
	{tags: ['WETH']},
);
