import {defineCapability} from './define';
import {url} from '$lib/core/utils/web/path';

/**
 * Resolves an app path to a URL. The app root provides its configured resolver
 * so links honour global query-param preservation and IPFS dynamic-route
 * handling.
 */
export type RouteResolver = (path: string, hash?: string) => string;

/**
 * The route capability.
 *
 * Fallback is `url()` (base-path / relative-aware resolution from `$app/paths`)
 * so links still work everywhere, including IPFS, when no resolver is provided;
 * the fallback only lacks the app-specific extras (query preservation, dynamic
 * route hashing) that a provider adds.
 */
const routeCapability = defineCapability<RouteResolver>('route', {
	fallback: () => url,
});

export const provideRoute = routeCapability.provide;
export const useRoute = routeCapability.use;
