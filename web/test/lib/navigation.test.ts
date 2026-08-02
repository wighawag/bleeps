import {describe, expect, it} from 'vitest';
import {HAS_MELODIES, NAV_LINKS} from '$lib/navigation';
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

	it('has no duplicates and no melody page without melodies', () => {
		const hrefs = NAV_LINKS.map((link) => link.href);
		expect(new Set(hrefs).size).toEqual(hrefs.length);
		// whether they all FIT is measured in the bar itself, not decided here:
		// both sides of it change width, so no static rule was ever right
		expect(hrefs.some((href) => href.startsWith('/editor'))).toEqual(
			HAS_MELODIES,
		);
	});
});
