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
	it('finds nothing in an empty hash', () => {
		expect(melodyFromHash('')).toBeUndefined();
		expect(melodyFromHash('#')).toBeUndefined();
		expect(melodyFromHash('#something=else')).toBeUndefined();
	});

	it('round-trips a melody through a hash', () => {
		const melody = emptyMelody();
		melody.name = 'from a link';
		melody.slots[4] = {note: 20, instrument: 3, volume: 6};

		const parsed = melodyFromHash(`#melody=${encodeMelodyToString(melody)}`);

		expect(parsed).toEqual(melody);
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
