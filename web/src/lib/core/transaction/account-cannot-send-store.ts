import {writable, type Readable} from 'svelte/store';

/**
 * Tracks whether the "this account cannot send transactions" notice should be
 * shown.
 *
 * The executor knows *statically* when a connected account cannot send under
 * the current execution mode (e.g. an email/social account in wallet execution
 * mode), but that persistent state should not pop a modal on its own. The notice
 * is opened explicitly by a call site when the user actually attempts to send,
 * and dismissed by the user.
 */
export type AccountCannotSendStore = Readable<boolean> & {
	show: () => void;
	dismiss: () => void;
};

export function createAccountCannotSendStore(): AccountCannotSendStore {
	const {subscribe, set} = writable(false);
	return {
		subscribe,
		show: () => set(true),
		dismiss: () => set(false),
	};
}
