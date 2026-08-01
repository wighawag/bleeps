import {readable, type Readable} from 'svelte/store';

export type OfflineValue = {
	offline: boolean;
};

export type OfflineStore = Readable<OfflineValue>;

/**
 * Creates a reactive store that tracks browser online/offline status.
 *
 * Uses `navigator.onLine` as the primary detection mechanism with
 * `online`/`offline` event listeners for real-time updates.
 *
 * **Browser quirks:**
 * - `navigator.onLine` can report `true` when behind a captive portal or
 *   when the device has a local network connection but no internet access.
 *   For those cases, the RPC health store provides more accurate detection.
 * - The `offline` event fires reliably when the OS reports no network interface.
 * - The `online` event may fire before actual connectivity is restored.
 */
export function createOfflineStore(): OfflineStore {
	return readable<OfflineValue>(
		{offline: typeof navigator !== 'undefined' ? !navigator.onLine : false},
		(set) => {
			if (typeof window === 'undefined') return;

			function handleOnline() {
				set({offline: false});
			}

			function handleOffline() {
				set({offline: true});
			}

			window.addEventListener('online', handleOnline);
			window.addEventListener('offline', handleOffline);

			return () => {
				window.removeEventListener('online', handleOnline);
				window.removeEventListener('offline', handleOffline);
			};
		},
	);
}
