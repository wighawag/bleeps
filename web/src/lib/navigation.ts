import initialDeployments from '$lib/deployments';
import {hasMelodies} from '$lib/melodies/deployment';

/**
 * Where this build of the site can go.
 *
 * bleeps.art and demo.bleeps.art are the same code built against different
 * deployments, and the difference between them is one fact: whether MeloBleeps
 * exists. Mainnet has Bleeps, the DAO and a finished sale. The demo chain also
 * has melodies, so it gets the melody list, the editor, melodies inside `Yours`,
 * and no reason to link anybody to a demo they are already on.
 *
 * Read from the STATIC deployments module rather than from the deployments
 * store, on purpose: which contracts a build contains is fixed when it is built,
 * the route guards need it before any context exists, and a constant is what
 * lets the tabs render right on the first paint.
 */
export const HAS_MELODIES = hasMelodies(initialDeployments);

export type NavLink = {href: string; title: string};

/**
 * The site's destinations, in order, About last.
 *
 * `/me` is `Yours`: on a build with melodies it holds both your Bleeps and your
 * melodies, and on one without it holds your Bleeps.
 */
export const NAV_LINKS: readonly NavLink[] = [
	{href: '/', title: 'Home'},
	{href: '/bleeps/', title: 'Bleeps'},
	...(HAS_MELODIES
		? [
				{href: '/melodies/', title: 'Melodies'},
				{href: '/editor/', title: 'Editor'},
			]
		: []),
	{href: '/me/', title: 'Yours'},
	{href: '/about/', title: 'About'},
];

/** The demo site, which is where melodies live when this build has none. */
export const DEMO_URL = 'https://demo.bleeps.art';
