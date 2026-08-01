import {resolve} from '$app/paths';
import {getParamsFromURL, queryStringifyNoArray} from './url.js';

/**
 * Dynamic route pattern definition
 * - pattern: Regex that captures (basePath)(dynamicValue) - must have 2 capture groups
 * - basePath: The static base path for hash-based URL conversion
 */
export type DynamicRoutePattern = {
	pattern: RegExp;
	basePath: string;
};

/**
 * Options for createRouteHandler
 */
export type RouteHandlerOptions<T extends readonly string[]> = {
	/** Global query parameters to preserve across routes */
	globalQueryParams: T;
	/** Dynamic route patterns for IPFS compatibility */
	dynamicRoutes?: DynamicRoutePattern[];
};

/**
 * Check if we're on a path-based IPFS gateway (non-unique origin)
 * These gateways don't support _redirects, so dynamic routes need hash-based URLs
 */
export function isPathBasedIPFS(): boolean {
	if (typeof window === 'undefined') return false;
	const path = window.location.pathname;
	return path.startsWith('/ipfs/') || path.startsWith('/ipns/');
}

export function createRouteHandler<T extends readonly string[]>(
	params: Record<string, string>,
	options: RouteHandlerOptions<T>,
) {
	const {globalQueryParams, dynamicRoutes = []} = options;

	/**
	 * Convert a path to hash-based URL if it matches a dynamic route pattern
	 * e.g., /explorer/tx/0x123 -> /explorer/tx/#0x123
	 */
	function convertToDynamicUrl(path: string): string {
		for (const {pattern, basePath} of dynamicRoutes) {
			const match = path.match(pattern);
			if (match && match[2]) {
				// Found a dynamic route - use hash-based URL for path-based IPFS
				return `${basePath}#${match[2]}`;
			}
		}
		return path;
	}

	/**
	 * Generate a route path, automatically handling dynamic routes for IPFS compatibility
	 *
	 * For paths matching dynamic route patterns (e.g., /explorer/tx/0x123):
	 * - On path-based IPFS gateways: converts to hash-based URL (/explorer/tx/#0x123)
	 * - On unique origin gateways: keeps the path-based URL
	 *
	 * @param p - The path to resolve
	 * @param hash - Optional hash to append (only used if path is not a dynamic route)
	 */
	function route(p: string, hash?: string) {
		// On path-based IPFS, check if this is a dynamic route that needs conversion
		if (
			typeof window !== 'undefined' &&
			isPathBasedIPFS() &&
			dynamicRoutes.length > 0
		) {
			const convertedPath = convertToDynamicUrl(p);
			if (convertedPath !== p) {
				// Path was converted to hash-based, resolve it with query params
				if (!convertedPath.endsWith('/') && !convertedPath.includes('#')) {
					return resolve<any>(
						`${convertedPath}/${getQueryStringToKeep(convertedPath)}`,
					);
				}
				return resolve<any>(
					`${convertedPath}${getQueryStringToKeep(convertedPath)}`,
				);
			}
		}

		// Normal route resolution
		if (!p.endsWith('/')) {
			p += '/';
		}
		const pathToResolve = `${p}${getQueryStringToKeep(p)}${hash ? `#${hash}` : ''}`;
		let path = resolve<any>(pathToResolve);
		return path;
	}

	function getQueryStringToKeep(p: string): string {
		if (globalQueryParams && globalQueryParams.length > 0) {
			const {params: paramFromPath} = getParamsFromURL(p);
			for (const queryParam of globalQueryParams) {
				if (
					typeof params[queryParam] != 'undefined' &&
					typeof paramFromPath[queryParam] === 'undefined'
				) {
					paramFromPath[queryParam] = params[queryParam];
				}
			}
			return queryStringifyNoArray(paramFromPath);
		} else {
			return '';
		}
	}

	function isSameRoute(a: string, b: string): boolean {
		return a === b || a === route(b);
	}

	function isParentRoute(a: string, b: string): boolean {
		return a.startsWith(b) || a.startsWith(route(b));
	}

	return {
		route,
		isSameRoute,
		isParentRoute,
		params: params as Record<T[number], string | undefined>,
	};
}

/**
 * Generate a URL for static resources (images, etc.)
 * Use `route()` for navigation paths instead.
 *
 * @param p - The path to resolve
 * @param hash - Optional hash to append
 */
export function url(p: string, hash?: string) {
	return resolve<any>(
		hash ? `${p}${hash.startsWith('#') ? hash : `#${hash}`}` : p,
	);
}
