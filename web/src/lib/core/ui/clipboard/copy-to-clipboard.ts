import {writable, type Readable} from 'svelte/store';

export type CopyToClipboardStore = Readable<boolean> & {
	/** Copy text and flip the store to true for `resetMs`. Returns success. */
	copy: (text: string) => Promise<boolean>;
};

/**
 * Copy-to-clipboard with transient "copied" feedback.
 *
 * Owns the `copied` flag (the store value) and its auto-reset timeout so
 * components don't each re-implement `writeText -> copied = true ->
 * setTimeout(reset)`. Consume it as a store:
 *
 * ```svelte
 * const copied = createCopyToClipboard();
 * <button onclick={() => copied.copy(value)}>
 *   {$copied ? 'Copied' : 'Copy'}
 * </button>
 * ```
 *
 * @param resetMs how long the flag stays true (default 1000ms).
 */
export function createCopyToClipboard(resetMs = 1000): CopyToClipboardStore {
	const {subscribe, set} = writable(false);
	let timer: ReturnType<typeof setTimeout> | undefined;

	async function copy(text: string): Promise<boolean> {
		try {
			await navigator.clipboard.writeText(text);
			set(true);
			if (timer) clearTimeout(timer);
			timer = setTimeout(() => set(false), resetMs);
			return true;
		} catch {
			return false;
		}
	}

	return {subscribe, copy};
}
