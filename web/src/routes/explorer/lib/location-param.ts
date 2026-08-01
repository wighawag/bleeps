import {readable, type Readable} from 'svelte/store';
import {browser} from '$app/environment';

/**
 * Extract a hex (0x...) parameter for an explorer page from a location,
 * supporting both IPFS gateway styles:
 * 1. URL hash (`#0x123`) - path-based IPFS gateways.
 * 2. URL pathname (`/explorer/<segment>/0x123`) - unique-origin IPFS with a
 *    `_redirects` rewrite.
 *
 * Pure: takes the hash/pathname explicitly so it can be unit tested.
 */
export function extractHexParam(
	pathSegment: string,
	location: {hash: string; pathname: string},
): `0x${string}` | null {
	const urlHash = location.hash.slice(1);
	if (urlHash && urlHash.startsWith('0x')) {
		return urlHash as `0x${string}`;
	}

	const pattern = new RegExp(`/explorer/${pathSegment}/(0x[a-fA-F0-9]+)`);
	const match = location.pathname.match(pattern);
	if (match && match[1]) {
		return match[1] as `0x${string}`;
	}

	return null;
}

/**
 * Readable store of a hex explorer param (address / tx hash) read from the URL,
 * re-reading on hashchange/popstate. Listener lifecycle is tied to the store's
 * subscription: the listeners are attached on first subscribe and removed on
 * last unsubscribe, so components just do `$paramStore`.
 *
 * @param pathSegment the explorer segment, e.g. 'address' or 'tx'.
 */
export function createHexLocationParamStore(
	pathSegment: string,
): Readable<`0x${string}` | null> {
	const initial = browser
		? extractHexParam(pathSegment, window.location)
		: null;

	return readable<`0x${string}` | null>(initial, (set) => {
		if (!browser) return;

		const update = () => set(extractHexParam(pathSegment, window.location));
		update();
		window.addEventListener('hashchange', update);
		window.addEventListener('popstate', update);
		return () => {
			window.removeEventListener('hashchange', update);
			window.removeEventListener('popstate', update);
		};
	});
}
