import {redirect} from '@sveltejs/kit';
import {HAS_MELODIES} from '$lib/navigation';
import {route} from '$lib';

/**
 * A build with no MeloBleeps has no melody pages: no HTML is emitted for this
 * route at all. Anyone who still reaches it (the static host's SPA fallback, an
 * old bookmark) is sent home from here.
 *
 * IN THE LOAD, not in the component. A routing decision belongs on the routing
 * surface, which is the only layer allowed to name the framework (ADR-0004 and
 * test/framework-boundary.test.ts); doing it in `onMount` put a `$app/navigation`
 * import inside `$lib`, and ran a frame after the empty page had already
 * painted. `prerender` is false on such a build, so this only ever runs in the
 * browser, on a route the build did not emit.
 */
export const prerender = HAS_MELODIES;

export function load() {
	if (!HAS_MELODIES) redirect(307, route('/'));
}
