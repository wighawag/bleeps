import type {TypedDeployments} from '$lib/core/connection/types';

/**
 * The melody contracts, where there are any.
 *
 * MeloBleeps is deployed on the demo chain and NOT on mainnet, and that is the
 * whole difference between the two sites: bleeps.art is Bleeps, a DAO and a
 * finished sale, while demo.bleeps.art also has melodies, an editor and an
 * indexer. The app reads which one it is from the deployment it was built
 * against rather than from a flag, for the same reason it works out the sale
 * mode from the chain (lib/sale/mode.ts): a fact that describes itself cannot be
 * described wrongly.
 *
 * `TypedDeployments` genuinely lacks these entries in a mainnet build, so a
 * direct `deployments.contracts.MeloBleeps` stops `pnpm check` compiling, which
 * is how this stays honest. Everything that touches melodies goes through here.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type ContractHandle = {address: `0x${string}`; abi: any};

function contract(
	deployments: TypedDeployments,
	name: string,
): ContractHandle | undefined {
	const contracts = deployments.contracts as unknown as Record<
		string,
		ContractHandle | undefined
	>;
	return contracts[name];
}

/** The token: reserve, reveal, mint, own. All a mint needs. */
export function melodyToken(
	deployments: TypedDeployments,
): ContractHandle | undefined {
	return contract(deployments, 'MeloBleeps');
}

/** The renderer: turns a melody into audio, on chain. What a preview needs. */
export function melodyRenderer(
	deployments: TypedDeployments,
): ContractHandle | undefined {
	return contract(deployments, 'MeloBleepsTokenURI');
}

/**
 * Whether this build has melodies at all.
 *
 * Both contracts, because half a deployment is not a feature: composing needs
 * the renderer and minting needs the token, and a chain that has melodies has
 * both. Decides the tabs, the melody half of `Yours`, whether the editor exists,
 * and which way the demo links point. See `lib/navigation.ts`.
 */
export function hasMelodies(deployments: TypedDeployments): boolean {
	return (
		melodyToken(deployments) !== undefined &&
		melodyRenderer(deployments) !== undefined
	);
}
