import {
	decodeMelodyFromString,
	emptyMelody,
	type MelodyInfo,
} from '$lib/melodies/melody';

/**
 * Melodies live in the URL hash, so a work in progress can be shared or
 * bookmarked without anything being stored anywhere.
 *
 * The pre-template app supported two formats: the current `name~speed~base64`
 * and, before it, a base64 JSON blob. Links of both kinds are out in the world,
 * so both are still read; only the current one is ever written.
 */
const PARAM = 'melody';

/**
 * What `melodyFromHash` found in the fragment.
 *
 * - `none`: there is no `melody` parameter, so the editor starts empty.
 * - `ok`: a melody was read and normalised.
 * - `error`: a `melody` parameter was present but could not be parsed. This is
 *   distinct from `none` so the editor can tell the user their link is broken
 *   rather than silently showing a blank melody that looks like lost work.
 */
export type MelodyFromHashResult =
	| {status: 'none'}
	| {status: 'ok'; melody: MelodyInfo}
	| {status: 'error'; reason: string};

export function melodyFromHash(hash: string): MelodyFromHashResult {
	const value = paramFromFragment(
		hash.startsWith('#') ? hash.slice(1) : hash,
		PARAM,
	);
	if (value === undefined) {
		return {status: 'none'};
	}
	const melody = parseMelody(value);
	if (melody === undefined) {
		return {
			status: 'error',
			reason: 'This link’s melody is malformed or truncated, so it could not be loaded.',
		};
	}
	return {status: 'ok', melody};
}

/**
 * Read a single parameter out of a URL fragment without the
 * `application/x-www-form-urlencoded` rules that `URLSearchParams` applies.
 *
 * The packed melody is base64, which uses `+`, `/` and `=` as real data
 * characters. All three are valid in a URL fragment, and `share()` writes them
 * raw, but `URLSearchParams.get` reinterprets `+` as a space. A share link whose
 * packed data happens to contain a `+` would then be silently corrupted and fail
 * to load. Splitting the fragment ourselves keeps those characters intact, and
 * matches the writer, which does no percent-encoding of its own.
 */
function paramFromFragment(fragment: string, name: string): string | undefined {
	const prefix = `${name}=`;
	for (const pair of fragment.split('&')) {
		if (pair.startsWith(prefix)) {
			return pair.slice(prefix.length);
		}
	}
	return undefined;
}

export function parseMelody(value: string): MelodyInfo | undefined {
	try {
		// The current format always has the `name~speed~data` separators. Anything
		// else is the old base64 JSON.
		const melody = value.includes('~')
			? decodeMelodyFromString(value)
			: (JSON.parse(atob(value)) as MelodyInfo);

		return normalise(melody);
	} catch {
		return undefined;
	}
}

/**
 * A melody from a link is untrusted input: it may predate the speed field, be
 * the wrong length, or carry values outside what a slot can hold. Rather than
 * letting that reach the encoder (where it would silently corrupt neighbouring
 * slots) it is clamped into range here.
 */
function normalise(melody: MelodyInfo): MelodyInfo {
	const empty = emptyMelody();
	const slots = empty.slots.map((fallback, index) => {
		const slot = melody.slots?.[index];
		if (!slot) {
			return fallback;
		}
		return {
			note: clamp(slot.note, 0, 63),
			instrument: clamp(slot.instrument, 0, 15),
			volume: clamp(slot.volume, 0, 7),
		};
	});

	return {
		name: typeof melody.name === 'string' ? melody.name : empty.name,
		speed: melody.speed ? clamp(melody.speed, 1, 255) : empty.speed,
		slots,
	};
}

function clamp(value: number, low: number, high: number): number {
	if (!Number.isFinite(value)) {
		return low;
	}
	return Math.min(high, Math.max(low, Math.floor(value)));
}
