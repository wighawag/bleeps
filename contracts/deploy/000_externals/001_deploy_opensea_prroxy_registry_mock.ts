import {execute} from 'rocketh';
import 'rocketh-deploy';
import {context} from '../_context';

export default execute(
	context,
	async ({deploy, accounts, artifacts}) => {
		await deploy(
			'WyvernProxyRegistry',
			{
				account: accounts.deployer,
				artifact: artifacts.OpenSeaProxyRegistryMock,
			}, {
        skipIfAlreadyDeployed: true
      }
		);
	},
	{tags: ['WyvernProxyRegistry']},
);

