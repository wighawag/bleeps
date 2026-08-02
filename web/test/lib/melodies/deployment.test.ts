import {describe, expect, it} from 'vitest';
import {readdirSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {
	hasMelodies,
	melodyRenderer,
	melodyToken,
} from '$lib/melodies/deployment';
import type {TypedDeployments} from '$lib/core/connection/types';

/**
 * bleeps.art and demo.bleeps.art are this same code built against different
 * deployments, and MeloBleeps is the whole difference. These pin that the app
 * reads it correctly, and that the two deployment records the repository
 * carries really do differ that way.
 */
function deploymentsWith(names: string[]): TypedDeployments {
	const contracts: Record<string, {address: string; abi: never[]}> = {
		Bleeps: {address: '0xbleeps', abi: []},
	};
	for (const name of names) {
		contracts[name] = {address: `0x${name}`, abi: []};
	}
	return {chain: {id: 1}, contracts} as unknown as TypedDeployments;
}

/** What is actually recorded in a deployment directory. */
function deployedContracts(environment: string): string[] {
	const directory = fileURLToPath(
		new URL(
			`../../../../contracts/deployments/${environment}/`,
			import.meta.url,
		),
	);
	return readdirSync(directory)
		.filter((file) => file.endsWith('.json') && !file.startsWith('old_'))
		.map((file) => file.slice(0, -'.json'.length));
}

describe('melody contracts', () => {
	it('are there when both the token and its renderer are', () => {
		const deployments = deploymentsWith(['MeloBleeps', 'MeloBleepsTokenURI']);
		expect(hasMelodies(deployments)).toBe(true);
		expect(melodyToken(deployments)?.address).toEqual('0xMeloBleeps');
		expect(melodyRenderer(deployments)?.address).toEqual(
			'0xMeloBleepsTokenURI',
		);
	});

	it('are absent where the deployment has none, which is mainnet', () => {
		const deployments = deploymentsWith([]);
		expect(hasMelodies(deployments)).toBe(false);
		expect(melodyToken(deployments)).toBeUndefined();
		expect(melodyRenderer(deployments)).toBeUndefined();
	});

	it('are not a feature when only half of them is deployed', () => {
		// composing needs the renderer and minting needs the token; a chain that
		// has melodies has both, so half a deployment is a broken one
		expect(hasMelodies(deploymentsWith(['MeloBleeps']))).toBe(false);
		expect(hasMelodies(deploymentsWith(['MeloBleepsTokenURI']))).toBe(false);
	});
});

describe('the deployments this repository carries', () => {
	// The premise of the whole arrangement: if these two ever stopped differing,
	// the two sites would stop differing too, silently.
	it('has no melody contracts on mainnet', () => {
		const contracts = deployedContracts('mainnet');
		expect(contracts).toContain('Bleeps');
		expect(contracts.filter((name) => name.startsWith('MeloBleeps'))).toEqual(
			[],
		);
	});

	it('has both melody contracts on demo', () => {
		const contracts = deployedContracts('demo');
		expect(contracts).toContain('MeloBleeps');
		expect(contracts).toContain('MeloBleepsTokenURI');
	});
});
