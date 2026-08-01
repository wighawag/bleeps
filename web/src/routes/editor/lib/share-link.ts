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

export function melodyFromHash(hash: string): MelodyInfo | undefined {
	const params = new URLSearchParams(
		hash.startsWith('#') ? hash.slice(1) : hash,
	);
	const value = params.get(PARAM);
	if (!value) {
		return undefined;
	}
	return parseMelody(value);
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
