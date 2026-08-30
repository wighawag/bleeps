import {describe, expect, it} from 'vitest';
import {
	melodyFromHash,
	parseMelody,
} from '../../../src/routes/editor/lib/share-link';
import {
	DEFAULT_SPEED,
	SLOT_COUNT,
	emptyMelody,
	encodeMelodyToString,
} from '$lib/melodies/melody';

describe('melodyFromHash', () => {
	it('reports nothing in an empty hash', () => {
		expect(melodyFromHash('')).toEqual({status: 'none'});
		expect(melodyFromHash('#')).toEqual({status: 'none'});
		expect(melodyFromHash('#something=else')).toEqual({status: 'none'});
	});

	it('round-trips a melody through a hash', () => {
		const melody = emptyMelody();
		melody.name = 'from a link';
		melody.slots[4] = {note: 20, instrument: 3, volume: 6};

		const parsed = melodyFromHash(`#melody=${encodeMelodyToString(melody)}`);

		expect(parsed).toEqual({status: 'ok', melody});
	});

	it('loads a link whose packed data contains a `+`', () => {
		// Base64 uses `+` as a real data character, but `URLSearchParams`
		// reinterprets `+` as a space, silently corrupting such a link. Find a
		// melody whose packing actually contains a `+` and assert it still loads.
		const melody = emptyMelody();
		melody.name = 'untitled';
		melody.speed = 32;
		let encoded = encodeMelodyToString(melody);
		let seed = 1;
		while (!encoded.includes('+')) {
			for (let i = 0; i < SLOT_COUNT; i++) {
				seed = (seed * 1103515245 + 12345) & 0x7fffffff;
				melody.slots[i] = {
					note: seed % 64,
					instrument: (seed >> 3) % 16,
					volume: (seed >> 7) % 8,
				};
			}
			encoded = encodeMelodyToString(melody);
		}

		expect(encoded.split('~')[2]).toContain('+');

		const parsed = melodyFromHash(`#melody=${encoded}`);

		expect(parsed).toEqual({status: 'ok', melody});
	});

	it('keeps every encoded melody round-tripping through a hash', () => {
		// Any melody may produce a `+`, `/` or `=` in its packing; this guards the
		// general case rather than a single link.
		const melody = emptyMelody();
		melody.name = 'edge';
		for (let i = 0; i < SLOT_COUNT; i++) {
			melody.slots[i] = {
				note: (i * 7) % 64,
				instrument: (i * 3) % 16,
				volume: (i * 5) % 8,
			};
		}

		const encoded = encodeMelodyToString(melody);
		const parsed = melodyFromHash(`#melody=${encoded}`);

		expect(parsed).toEqual({status: 'ok', melody});
	});

	it('reports an error, rather than nothing, for a malformed link', () => {
		// A present-but-unparseable `melody` param must be distinguishable from an
		// absent one, so the editor can tell the user their link is broken instead
		// of silently showing a blank melody.
		const truncated =
			'#melody=untitled~32~qwJYKsCWCrAlgqtpW6rqV2q6ldqt1W6r9V+q/FfSvlXw==';

		expect(melodyFromHash(truncated).status).toBe('error');
		expect(melodyFromHash('#melody=not-a-melody').status).toBe('error');
	});
});

describe('parseMelody', () => {
	it('reads the pre-template base64 JSON format', () => {
		// links in this format are still in circulation
		const legacy = {
			name: 'old link',
			speed: 12,
			slots: Array.from({length: SLOT_COUNT}, (_, i) => ({
				note: i,
				instrument: 1,
				volume: 4,
			})),
		};

		const parsed = parseMelody(btoa(JSON.stringify(legacy)));

		expect(parsed?.name).toEqual('old link');
		expect(parsed?.speed).toEqual(12);
		expect(parsed?.slots[5]).toEqual({note: 5, instrument: 1, volume: 4});
	});

	it('supplies a speed for a legacy link that predates the field', () => {
		const legacy = {name: 'no speed', slots: emptyMelody().slots};
		expect(parseMelody(btoa(JSON.stringify(legacy)))?.speed).toEqual(
			DEFAULT_SPEED,
		);
	});

	it('returns undefined rather than throwing on rubbish', () => {
		expect(parseMelody('not base64 and not a melody')).toBeUndefined();
		expect(parseMelody('~~')).toBeUndefined();
	});

	it('pads a link that is short of slots', () => {
		const short = {
			name: 'short',
			speed: 16,
			slots: [{note: 5, instrument: 1, volume: 2}],
		};

		const parsed = parseMelody(btoa(JSON.stringify(short)));

		expect(parsed?.slots).toHaveLength(SLOT_COUNT);
		expect(parsed?.slots[0]).toEqual({note: 5, instrument: 1, volume: 2});
		expect(parsed?.slots[31]).toEqual({note: 0, instrument: 0, volume: 0});
	});

	it('clamps values that a slot cannot hold', () => {
		// out-of-range values would overflow into the neighbouring slot's bits once
		// encoded, corrupting a melody rather than merely looking odd
		const wild = {
			name: 'wild',
			speed: 9999,
			slots: [
				{note: 999, instrument: 999, volume: 999},
				{note: -5, instrument: -5, volume: -5},
				{note: NaN, instrument: NaN, volume: NaN},
			],
		};

		const parsed = parseMelody(btoa(JSON.stringify(wild)));

		expect(parsed?.slots[0]).toEqual({note: 63, instrument: 15, volume: 7});
		expect(parsed?.slots[1]).toEqual({note: 0, instrument: 0, volume: 0});
		expect(parsed?.slots[2]).toEqual({note: 0, instrument: 0, volume: 0});
		expect(parsed?.speed).toEqual(255);
	});
});
