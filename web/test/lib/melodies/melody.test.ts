import {describe, expect, it} from 'vitest';
import {
	DEFAULT_SPEED,
	SLOT_COUNT,
	decodeMelodyFromChainData,
	decodeMelodyFromString,
	defaultMelody,
	emptyMelody,
	encodeMelodyToChainData,
	encodeMelodyToString,
	melodyNameProblem,
	type MelodyInfo,
	type Slot,
} from '$lib/melodies/melody';

function melody(
	slots: Slot[],
	name = 'test',
	speed = DEFAULT_SPEED,
): MelodyInfo {
	return {name, speed, slots};
}

/** Something that uses the whole range of every field. */
function busyMelody(): MelodyInfo {
	const slots: Slot[] = [];
	for (let i = 0; i < SLOT_COUNT; i++) {
		slots.push({
			note: (i * 7) % 64,
			instrument: i % 9,
			volume: i % 8,
		});
	}
	return melody(slots, 'a busy one', 20);
}

describe('chain encoding', () => {
	it('packs 16 bits per slot, most significant slot first', () => {
		const slots = emptyMelody().slots;
		slots[0] = {note: 1, instrument: 0, volume: 0};

		const {data1, data2} = encodeMelodyToChainData(melody(slots));

		// slot 0 lands in the top 16 bits of data1
		expect(data1).toEqual(
			'0x0001000000000000000000000000000000000000000000000000000000000000',
		);
		expect(data2).toEqual(
			'0x0000000000000000000000000000000000000000000000000000000000000000',
		);
	});

	it('puts slot 16 at the top of the second word', () => {
		const slots = emptyMelody().slots;
		slots[16] = {note: 1, instrument: 0, volume: 0};

		const {data1, data2} = encodeMelodyToChainData(melody(slots));

		expect(data1).toEqual(
			'0x0000000000000000000000000000000000000000000000000000000000000000',
		);
		expect(data2).toEqual(
			'0x0001000000000000000000000000000000000000000000000000000000000000',
		);
	});

	it('composes note, instrument and volume the way the contract reads them', () => {
		const slots = emptyMelody().slots;
		// value = note + instrument * 64 + volume * 1024
		slots[0] = {note: 63, instrument: 8, volume: 7};
		const expected = 63 + 8 * 64 + 7 * 1024;

		const {data1} = encodeMelodyToChainData(melody(slots));

		expect(parseInt(data1.slice(2, 6), 16)).toEqual(expected);
	});

	it('round-trips through the chain encoding', () => {
		const original = busyMelody();
		const {data1, data2} = encodeMelodyToChainData(original);

		const decoded = decodeMelodyFromChainData({
			name: original.name,
			speed: original.speed,
			data1,
			data2,
		});

		expect(decoded).toEqual(original);
	});
});

describe('share links', () => {
	it('round-trips', () => {
		const original = busyMelody();
		const decoded = decodeMelodyFromString(encodeMelodyToString(original));
		expect(decoded).toEqual(original);
	});

	it('keeps a name with spaces', () => {
		const original = melody(emptyMelody().slots, 'two words here');
		expect(decodeMelodyFromString(encodeMelodyToString(original)).name).toEqual(
			'two words here',
		);
	});

	it('survives a silent melody', () => {
		const original = emptyMelody();
		expect(decodeMelodyFromString(encodeMelodyToString(original))).toEqual(
			original,
		);
	});

	/**
	 * The old app produced links in this format and people have pasted them into
	 * chats, so the packing has to stay byte-compatible.
	 *
	 * This reimplements the pre-template algorithm (13 bits per slot, packed into
	 * two 26-byte halves, then base64) with bigints instead of ethers, and checks
	 * the new encoder agrees. If someone ever "tidies" the packing, this fails.
	 */
	it('is byte-compatible with the pre-template encoding', () => {
		const original = busyMelody();

		const halves = [0n, 0n];
		for (let i = 0; i < 32; i++) {
			const slot = original.slots[i];
			const value = BigInt(
				slot.note + slot.instrument * 64 + slot.volume * 64 * 16,
			);
			if (i < 16) {
				halves[0] |= value << BigInt((15 - i) * 13);
			} else {
				halves[1] |= value << BigInt((31 - i) * 13);
			}
		}
		const hex =
			halves[0].toString(16).padStart(52, '0') +
			halves[1].toString(16).padStart(52, '0');
		const bytes = Uint8Array.from(
			hex.match(/.{2}/g)!.map((pair) => parseInt(pair, 16)),
		);
		let binary = '';
		for (const byte of bytes) {
			binary += String.fromCharCode(byte);
		}
		const expected = `${original.name.replace(/ /g, '_')}~${original.speed}~${btoa(binary)}`;

		expect(encodeMelodyToString(original)).toEqual(expected);
	});

	it('falls back to the default speed on a malformed speed', () => {
		const original = busyMelody();
		const [name, , packed] = encodeMelodyToString(original).split('~');
		expect(decodeMelodyFromString(`${name}~nonsense~${packed}`).speed).toEqual(
			DEFAULT_SPEED,
		);
	});

	it('refuses something that is not a melody string', () => {
		expect(() => decodeMelodyFromString('nope')).toThrow();
	});
});

describe('defaultMelody', () => {
	it('is not silent, so the editor opens with something to hear', () => {
		expect(defaultMelody().slots.some((slot) => slot.volume > 0)).toBe(true);
	});

	it('decodes from its share link and round-trips', () => {
		const tune = defaultMelody();
		expect(encodeMelodyToString(tune)).toEqual(
			'untitled~24~qwJYKsCWCrAlgqtpW6rqV2q6ldqt1W6raVurGljqxpY6sKWGrClhqv1X6r9V+q/FfSvlXw==',
		);
		expect(tune.speed).toEqual(24);
		expect(tune.slots).toHaveLength(SLOT_COUNT);
	});

	it('returns an independent copy each call', () => {
		// the editor mutates slots; the cached default must not be affected
		const a = defaultMelody();
		const b = defaultMelody();
		a.slots[0] = {note: 0, instrument: 0, volume: 0};
		expect(b.slots[0]).not.toEqual(a.slots[0]);
		expect(defaultMelody().slots[0]).not.toEqual(a.slots[0]);
	});
});

describe('melodyNameProblem', () => {
	it('allows ordinary names', () => {
		expect(melodyNameProblem('plain')).toBeUndefined();
		expect(melodyNameProblem('two words')).toBeUndefined();
		expect(melodyNameProblem("it's fine!? (really)")).toBeUndefined();
	});

	it('rejects what would break the contract-built JSON', () => {
		// MeloBleepsTokenURI splices the name in unescaped, so these produce
		// metadata nothing can parse, permanently
		expect(melodyNameProblem('quote"inside')).toBeDefined();
		expect(melodyNameProblem('back\\slash')).toBeDefined();
		expect(melodyNameProblem('new\nline')).toBeDefined();
	});
});
