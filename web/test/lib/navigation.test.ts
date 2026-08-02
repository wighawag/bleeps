import {describe, expect, it} from 'vitest';
import {HAS_MELODIES, NAV_LINKS, NEEDS_MORE_MENU} from '$lib/navigation';
import {hasMelodies} from '$lib/melodies/deployment';
import deployments from '$lib/deployments';

/**
 * The tabs are a fact about the build, not a preference: a deployment with
 * MeloBleeps gets the melody pages, one without does not. These run against
 * whatever `src/lib/deployments.ts` currently holds, so they hold for a mainnet
 * build and a demo build alike.
 */
describe('the site navigation', () => {
	it('follows the deployment it was built against', () => {
		expect(HAS_MELODIES).toEqual(hasMelodies(deployments));
	});

	it('always offers Bleeps, Yours and About, with About last', () => {
		const titles = NAV_LINKS.map((link) => link.title);
		expect(titles).toContain('Bleeps');
		expect(titles).toContain('Yours');
		expect(titles[titles.length - 1]).toEqual('About');
	});

	it('offers the melody pages exactly when melodies exist', () => {
		const titles = NAV_LINKS.map((link) => link.title);
		expect(titles.includes('Melodies')).toEqual(HAS_MELODIES);
		expect(titles.includes('Editor')).toEqual(HAS_MELODIES);
	});

	it('only folds the tabs away when there are more than four', () => {
		// four tabs fit beside a Connect button at 320px and six do not, so a
		// mainnet build needs no `More` menu at all
		expect(NEEDS_MORE_MENU).toEqual(NAV_LINKS.length > 4);
		expect(NEEDS_MORE_MENU).toEqual(HAS_MELODIES);
	});
});
