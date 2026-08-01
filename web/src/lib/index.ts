import {createRouteHandler} from './core/utils/web/path';
import {
	getHashParamsFromLocation,
	getParamsFromLocation,
} from './core/utils/web/url';

import {createServiceWorker} from '$lib/core/service-worker';
import {createNotificationsService} from './core/notifications';
import {createContext} from 'svelte';
import type {Context} from './context/types';
import {env} from '$env/dynamic/public';

export const hashParams = getHashParamsFromLocation();

const {params: paramFromLocation} = getParamsFromLocation();
export const {isParentRoute, isSameRoute, route, params} = createRouteHandler(
	paramFromLocation,
	{
		globalQueryParams: [
			'dev',
			'transactions',
			'debug',
			'debugLevel',
			'traceLevel',
			'debugLabel',
			'eruda',
			'tx-observer',
			'burner',
		] as const,
		// Dynamic routes that need hash-based URLs on path-based IPFS gateways
		dynamicRoutes: [
			{
				pattern: /^(\/explorer\/tx\/)(0x[a-fA-F0-9]+)\/?$/,
				basePath: '/explorer/tx/',
			},
			{
				pattern: /^(\/explorer\/address\/)(0x[a-fA-F0-9]+)\/?$/,
				basePath: '/explorer/address/',
			},
		],
	},
);

export const dev = params.dev || import.meta.env.DEV;

// Runtime override for the burner wallet (see context/burner.ts). Preserved
// across navigation because `burner` is a global query param above.
export {parseBurnerParam} from './context/burner';
import {parseBurnerParam as _parseBurnerParam} from './context/burner';
export const burnerOverride = _parseBurnerParam(params.burner);

export const notifications = createNotificationsService();
export const serviceWorker = createServiceWorker(notifications);

const [getAppContextFunction, setAppContext] = createContext<() => Context>();

const getAppContext = () => getAppContextFunction()();
export {getAppContext, setAppContext};

// Dev/debug: attaching to globalThis for console access
(globalThis as any).env = env;
// Dev/debug: attaching to globalThis for console access
(globalThis as any).vite_env = import.meta.env;

// HMR cleanup: Remove service worker listeners when module is hot-replaced in dev
// This prevents listener accumulation during development
if (import.meta.hot) {
	import.meta.hot.dispose(() => {
		serviceWorker.cleanup();
	});
}
