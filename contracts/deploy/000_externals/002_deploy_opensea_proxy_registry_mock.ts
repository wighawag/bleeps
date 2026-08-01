import {deployScript, artifacts} from '../../rocketh/deploy.js';

/**
 * A stand-in for OpenSea's Wyvern proxy registry, for dev chains only.
 *
 * Bleeps grants the registry's proxies a blanket transfer approval, so without
 * something at this address the OpenSea listing path cannot be exercised
 * locally. On live chains the real registry's address is passed to the Bleeps
 * constructor instead (see deploy/001_bleeps).
 */
export default deployScript(
	async (env) => {
		const {deployer} = env.namedAccounts;

		await env.deploy(
			'WyvernProxyRegistry',
			{
				account: deployer,
				artifact: artifacts.OpenSeaProxyRegistryMock,
				args: [],
			},
			{skipIfAlreadyDeployed: true},
		);
	},
	{tags: ['WyvernProxyRegistry', 'externals']},
);
