import {describe, expect, it} from 'vitest';
import {
	INSTRUMENT_COUNT,
	NOTES_PER_INSTRUMENT,
	decomposeId,
	instrumentRows,
	isOwned,
	isValidBleepId,
} from '$lib/bleeps/grid';

const OWNER = '0x1111111111111111111111111111111111111111';
const ZERO = '0x0000000000000000000000000000000000000000';

describe('id arithmetic', () => {
	it('matches the contract: id = note + instrument * 64', () => {
		expect(decomposeId(0)).toEqual({note: 0, instrument: 0});
		expect(decomposeId(63)).toEqual({note: 63, instrument: 0});
		expect(decomposeId(64)).toEqual({note: 0, instrument: 1});
		// 448 is the first of instrument 7, the creator's reserved range
		expect(decomposeId(448)).toEqual({note: 0, instrument: 7});
		expect(decomposeId(575)).toEqual({note: 63, instrument: 8});
	});

	it('accepts exactly the ids that can exist', () => {
		expect(isValidBleepId(0)).toBe(true);
		expect(isValidBleepId(575)).toBe(true);
		expect(isValidBleepId(576)).toBe(false);
		expect(isValidBleepId(-1)).toBe(false);
		expect(isValidBleepId(1.5)).toBe(false);
		expect(isValidBleepId(NaN)).toBe(false);
	});
});

describe('ownership', () => {
	it('treats the zero address as unminted', () => {
		// `owners` returns the zero address for an unminted token rather than
		// reverting, so this is the only signal that a Bleep exists
		expect(isOwned(ZERO)).toBe(false);
		expect(isOwned(undefined)).toBe(false);
		expect(isOwned(OWNER)).toBe(true);
	});
});

describe('instrumentRows', () => {
	it('lays out 9 instruments of 64', () => {
		const rows = instrumentRows(undefined);

		expect(rows).toHaveLength(INSTRUMENT_COUNT);
		expect(rows[0].bleeps).toHaveLength(NOTES_PER_INSTRUMENT);
		expect(rows.flatMap((r) => r.bleeps)).toHaveLength(576);
	});

	it('renders its shape before any chain read has landed', () => {
		// the grid should not be blank while the first read is in flight
		const rows = instrumentRows(undefined);
		expect(rows[0].bleeps[0]).toEqual({id: 0, owner: undefined});
		expect(rows.every((r) => r.minted === 0)).toBe(true);
	});

	it('maps owners onto the right tiles and counts per instrument', () => {
		const owners = Array.from({length: 576}, () => ZERO);
		owners[0] = OWNER;
		owners[63] = OWNER;
		owners[64] = OWNER;

		const rows = instrumentRows(owners);

		expect(rows[0].minted).toBe(2);
		expect(rows[1].minted).toBe(1);
		expect(rows[0].bleeps[0].owner).toBe(OWNER);
		expect(rows[1].bleeps[0].owner).toBe(OWNER);
		expect(rows[1].bleeps[1].owner).toBe(ZERO);
	});

	it('names each row after its instrument', () => {
		const rows = instrumentRows(undefined);
		expect(rows[0].name).toBe('TRIANGLE');
		expect(rows[8].name).toBe('FUNKY SAW');
	});
});
