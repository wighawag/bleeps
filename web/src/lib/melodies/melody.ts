import {encodeNote} from './notes.js';

/**
 * A melody: 32 slots, each a note, an instrument and a volume.
 *
 * This is the editor's model. It maps onto the contract's two bytes32 words via
 * `encodeMelodyToChainData`, and onto a share link via
 * `encodeMelodyToString`. Those two use DIFFERENT packings and that is
 * deliberate, see below.
 */
export type Slot = {volume: number; note: number; instrument: number};

export const SLOT_COUNT = 32;

export type MelodyInfo = {
	name: string;
	slots: Slot[];
	speed: number;
};

/** What the contract calls speed 16: the default note length. */
export const DEFAULT_SPEED = 16;

const SILENCE: Slot = {volume: 0, note: 0, instrument: 0};

export function emptyMelody(): MelodyInfo {
	return {
		name: 'untitled',
		slots: Array.from({length: SLOT_COUNT}, () => ({...SILENCE})),
		speed: DEFAULT_SPEED,
	};
}

function toWord(value: bigint): `0x${string}` {
	return `0x${value.toString(16).padStart(64, '0')}`;
}

/**
 * The two bytes32 words the contract stores and renders from.
 *
 * 16 bits per slot: slots 0..15 in `data1`, 16..31 in `data2`. This is the
 * encoding `MeloBleepsTokenURI` reads, so it is the one that must be right.
 */
export function encodeMelodyToChainData(melody: MelodyInfo): {
	data1: `0x${string}`;
	data2: `0x${string}`;
} {
	const pack = (slots: Slot[]) =>
		slots.reduce((word, slot, index) => encodeNote(word, {...slot, index}), 0n);
	return {
		data1: toWord(pack(melody.slots.slice(0, 16))),
		data2: toWord(pack(melody.slots.slice(16))),
	};
}

/**
 * Read a melody back out of the contract's two words.
 *
 * The inverse of `encodeMelodyToChainData`, used for melodies that came from the
 * chain (or the subgraph) rather than from the editor.
 */
export function decodeMelodyFromChainData(params: {
	name: string;
	speed: number;
	data1: string;
	data2: string;
}): MelodyInfo {
	const words = BigInt(params.data1) * 2n ** 256n + BigInt(params.data2);
	const slots: Slot[] = [];
	for (let i = 0; i < SLOT_COUNT; i++) {
		const shift = BigInt((SLOT_COUNT - 1 - i) * 16);
		const value = (words >> shift) & 0xffffn;
		slots.push({
			note: Number(value % 64n),
			instrument: Number((value >> 6n) % 16n),
			volume: Number((value >> 10n) % 8n),
		});
	}
	return {name: params.name, speed: params.speed, slots};
}

// ----------------------------------------------------------------------------
// Share links
//
// A melody in a URL uses 13 bits per slot rather than 16, because a slot only
// needs 13 (6 note + 4 instrument + 3 volume) and a share link is something a
// person pastes into a chat window. That saves 6 bytes of base64 per melody.
//
// This packing is NOT what the contract reads and must never be handed to it.
// It only has to round-trip with `decodeMelodyFromString`.
// ----------------------------------------------------------------------------

const BITS_PER_SLOT = 13n;

/** Bytes needed for 32 slots at 13 bits each, rounded up. */
const PACKED_BYTES = 52;

function base64FromBytes(bytes: Uint8Array): string {
	let binary = '';
	for (const byte of bytes) {
		binary += String.fromCharCode(byte);
	}
	return btoa(binary);
}

function bytesFromBase64(value: string): Uint8Array {
	const binary = atob(value);
	return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

function bigintToBytes(value: bigint, length: number): Uint8Array {
	const bytes = new Uint8Array(length);
	let remaining = value;
	for (let i = length - 1; i >= 0; i--) {
		bytes[i] = Number(remaining & 0xffn);
		remaining >>= 8n;
	}
	return bytes;
}

function bytesToBigint(bytes: Uint8Array): bigint {
	let value = 0n;
	for (const byte of bytes) {
		value = (value << 8n) + BigInt(byte);
	}
	return value;
}

export function encodeMelodyToString(melody: MelodyInfo): string {
	const halves = [0n, 0n];
	for (let i = 0; i < SLOT_COUNT; i++) {
		const slot = melody.slots[i];
		const half = i < 16 ? 0 : 1;
		const shift = BigInt((15 - (i % 16)) * Number(BITS_PER_SLOT));
		const value = BigInt(
			slot.note + slot.instrument * 64 + slot.volume * 64 * 16,
		);
		halves[half] |= value << shift;
	}

	const packed = new Uint8Array(PACKED_BYTES);
	packed.set(bigintToBytes(halves[0], PACKED_BYTES / 2), 0);
	packed.set(bigintToBytes(halves[1], PACKED_BYTES / 2), PACKED_BYTES / 2);

	const name = melody.name.replace(/ /g, '_');
	return `${name}~${melody.speed}~${base64FromBytes(packed)}`;
}

export function decodeMelodyFromString(melodyString: string): MelodyInfo {
	const [nameString, speedString, packedBase64] = melodyString.split('~');
	if (packedBase64 === undefined) {
		throw new Error(`not a melody string: ${melodyString}`);
	}

	const packed = bytesFromBase64(packedBase64);
	if (packed.length !== PACKED_BYTES) {
		// Reject rather than pad. A truncated link decoded as a valid but silent
		// melody would look like the editor had lost the user's work.
		throw new Error(
			`melody string carries ${packed.length} bytes, expected ${PACKED_BYTES}`,
		);
	}
	const halves = [
		bytesToBigint(packed.subarray(0, PACKED_BYTES / 2)),
		bytesToBigint(packed.subarray(PACKED_BYTES / 2)),
	];

	const slots: Slot[] = [];
	for (let i = 0; i < SLOT_COUNT; i++) {
		const half = i < 16 ? 0 : 1;
		const shift = BigInt((15 - (i % 16)) * Number(BITS_PER_SLOT));
		const value = (halves[half] >> shift) & 0x1fffn;
		slots.push({
			note: Number(value % 64n),
			instrument: Number((value >> 6n) % 16n),
			volume: Number((value >> 10n) % 8n),
		});
	}

	const speed = parseInt(speedString, 10);
	return {
		name: nameString.replace(/_/g, ' '),
		speed: Number.isNaN(speed) ? DEFAULT_SPEED : speed,
		slots,
	};
}
