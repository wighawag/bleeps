import {deployScript, artifacts} from '../../rocketh/deploy.js';
import type {Abi_Bleeps} from '../../generated/abis/Bleeps.js';

/**
 * The ENS registry, at the same address on mainnet and every testnet.
 *
 * Bleeps takes it in its constructor so it can set its own reverse record. On a
 * local chain nothing lives at this address and the feature is simply inert.
 */
const ENS_REGISTRY = '0x00000000000C2E074eC69A0dFb2997BA6C7d2e1e';

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';

export default deployScript(
	async (env) => {
		const {
			deployer,
			initialBleepsOwner,
			initialBleepsTokenURIAdmin,
			initialBleepsRoyaltyAdmin,
			initialBleepsRoyaltyRecipient,
			bleepsGuardian,
			initialCheckpointingDisabler,
		} = env.namedAccounts;

		const tokenURIContract = await env.deploy('BleepsTokenURI', {
			account: deployer,
			artifact: artifacts.BleepsTokenURI,
			args: [],
		});

		const existingBleeps = env.getOrNull<Abi_Bleeps>('Bleeps');

		// Only present on dev chains (see deploy/000_externals). On live chains
		// the real registry address is what should be passed here.
		const openseaProxyRegistry =
			env.getOrNull('WyvernProxyRegistry')?.address || ZERO_ADDRESS;

		const ens = env.getOrNull('ENS')?.address || ENS_REGISTRY;

		if (existingBleeps) {
			// Bleeps is already live; the only thing a redeploy can legitimately
			// change is where it reads its metadata from.
			const currentTokenURIContract = await env.read(existingBleeps, {
				functionName: 'tokenURIContract',
			});
			if (
				currentTokenURIContract?.toLowerCase() !==
				tokenURIContract.address.toLowerCase()
			) {
				await env.execute(existingBleeps, {
					account: initialBleepsTokenURIAdmin,
					functionName: 'setTokenURIContract',
					args: [tokenURIContract.address],
				});
			}
			return;
		}

		await env.deploy(
			'Bleeps',
			{
				account: deployer,
				artifact: artifacts.Bleeps,
				args: [
					ens,
					initialBleepsOwner,
					initialBleepsTokenURIAdmin,
					deployer, // minterAdmin, changed once the first sale is deployed
					initialBleepsRoyaltyAdmin,
					bleepsGuardian,
					openseaProxyRegistry,
					initialBleepsRoyaltyRecipient,
					500n, // 5%
					tokenURIContract.address,
					initialCheckpointingDisabler,
				],
			},
			{skipIfAlreadyDeployed: true},
		);
	},
	{tags: ['Bleeps', 'Bleeps_deploy']},
);
