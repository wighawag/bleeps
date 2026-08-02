import {HAS_MELODIES} from '$lib/navigation';

/**
 * A build with no MeloBleeps has no melody pages: no HTML is emitted for this
 * route at all. Anyone who still reaches it (the static host's SPA fallback, an
 * old bookmark) is sent home by +page.svelte.
 */
export const prerender = HAS_MELODIES;
