import {deployScript, artifacts} from '../../rocketh/deploy.js';

/**
 * A WETH of our own, for dev chains only.
 *
 * Live chains have a canonical WETH, resolved in deploy/utils.ts. This script
 * is therefore only listed in the dev script set.
 */
export default deployScript(
	async (env) => {
		const {deployer} = env.namedAccounts;

		await env.deploy(
			'WETH',
			{
				account: deployer,
				artifact: artifacts.WETH9,
				args: [],
			},
			{skipIfAlreadyDeployed: true},
		);
	},
	{tags: ['WETH', 'externals']},
);
