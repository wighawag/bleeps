import {deployScript, artifacts} from '../../rocketh/deploy.js';
import {isLocalDevChain} from '../utils.js';
import type {Abi_MeloBleeps} from '../../generated/abis/MeloBleeps.js';

/**
 * MeloBleeps: melodies composed out of Bleeps.
 *
 * Not on mainnet yet, so on a throwaway chain we redeploy it from scratch on
 * every run rather than preserving an old one; the contract is still moving and
 * a stale deployment is more confusing than a fresh one. On a real chain,
 * including Sepolia, it is deploy-once like Bleeps, and replacing it is a
 * deliberate act (delete the deployment file).
 */
export default deployScript(
	async (env) => {
		const {
			deployer,
			initialMeloBleepsOwner,
			initialMeloBleepsTokenURIAdmin,
			initialMeloBleepsRoyaltyAdmin,
			initialMeloBleepsMinterAdmin,
			melobleepsGuardian,
		} = env.namedAccounts;

		const devMode = isLocalDevChain(env);

		const tokenURIContract = await env.deploy('MeloBleepsTokenURI', {
			account: deployer,
			artifact: artifacts.MeloBleepsTokenURI,
			args: [],
		});

		const existingMeloBleeps = env.getOrNull<Abi_MeloBleeps>('MeloBleeps');

		if (!existingMeloBleeps || devMode) {
			await env.deploy(
				'MeloBleeps',
				{
					account: deployer,
					artifact: artifacts.MeloBleeps,
					args: [
						initialMeloBleepsOwner,
						initialMeloBleepsTokenURIAdmin,
						initialMeloBleepsRoyaltyAdmin,
						initialMeloBleepsMinterAdmin,
						melobleepsGuardian,
						tokenURIContract.address,
					],
				},
				{skipIfAlreadyDeployed: !devMode},
			);
			return;
		}

		const currentTokenURIContract = await env.read(existingMeloBleeps, {
			functionName: 'tokenURIContract',
		});
		if (
			currentTokenURIContract?.toLowerCase() !==
			tokenURIContract.address.toLowerCase()
		) {
			await env.execute(existingMeloBleeps, {
				account: initialMeloBleepsTokenURIAdmin,
				functionName: 'setTokenURIContract',
				args: [tokenURIContract.address],
			});
		}
	},
	{tags: ['MeloBleeps', 'MeloBleeps_deploy']},
);
