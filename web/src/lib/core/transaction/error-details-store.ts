import {writable, type Readable} from 'svelte/store';

/**
 * Holds the full text of a transaction error for the "Details" modal.
 *
 * Toasts show only a short summary; the full multi-line error (viem request
 * args, docs link, etc.) is shown on demand via {@link show}. `null` means the
 * modal is closed.
 */
export type ErrorDetailsStore = Readable<{
	title: string;
	details: string;
} | null> & {
	show: (details: string, title?: string) => void;
	dismiss: () => void;
};

export function createErrorDetailsStore(): ErrorDetailsStore {
	const {subscribe, set} = writable<{title: string; details: string} | null>(
		null,
	);
	return {
		subscribe,
		show: (details, title = 'Transaction error') => set({title, details}),
		dismiss: () => set(null),
	};
}
