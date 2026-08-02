import {describe, expect, it} from 'vitest';
import {readFileSync} from 'node:fs';
import {MAINNET_CONTRACTS} from '$lib/mainnet';

/**
 * The footer quotes three mainnet addresses as plain text. They are typed by
 * hand (see lib/mainnet.ts for why they are not read from `deployments`), and a
 * wrong character in an address is exactly the kind of mistake that looks right
 * and sends somebody to the wrong contract. So they are checked against the
 * deployment record the repository already carries.
 */
function deployedAddress(name: string): string {
	const path = new URL(
		`../../../contracts/deployments/mainnet/${name}.json`,
		import.meta.url,
	);
	return JSON.parse(readFileSync(path, 'utf-8')).address;
}

describe('the mainnet addresses the site quotes', () => {
	const expected = [
		['Bleeps', "Bleeps contract's address"],
		['BleepsDAOAccount', "Bleeps DAO Account's address"],
		['BleepsDAOGovernor', "Bleeps DAO Governance contract's address"],
	] as const;

	it('names the three contracts the footer talks about', () => {
		expect(MAINNET_CONTRACTS.map((c) => c.label)).toEqual(
			expected.map(([, label]) => label),
		);
	});

	for (const [deployment, label] of expected) {
		it(`matches deployments/mainnet/${deployment}.json`, () => {
			const quoted = MAINNET_CONTRACTS.find((c) => c.label === label);
			expect(quoted?.address).toEqual(deployedAddress(deployment));
		});
	}
});
