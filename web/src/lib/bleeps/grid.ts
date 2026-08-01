import {instrumentName} from '$lib/melodies/notes';

/**
 * The Bleeps grid, arranged the way the token ids are: 9 instruments of 64 notes,
 * where `id = note + instrument * 64`.
 */
export const NOTES_PER_INSTRUMENT = 64;
export const INSTRUMENT_COUNT = 9;

export type BleepEntry = {
	id: number;
	owner?: string;
};

export type InstrumentRow = {
	instrument: number;
	name: string;
	bleeps: BleepEntry[];
	/** How many of this instrument's 64 notes have an owner. */
	minted: number;
};

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';

export function isOwned(owner: string | undefined): boolean {
	return !!owner && owner.toLowerCase() !== ZERO_ADDRESS;
}

/**
 * Group the flat 576-entry owners table into one row per instrument.
 *
 * `owners` comes straight from `Bleeps.owners(ids)` and is indexed by id, so the
 * grouping is pure arithmetic. Tolerates a short or absent table so the grid can
 * render its shape before the first chain read lands.
 */
export function instrumentRows(
	owners: readonly string[] | undefined,
): InstrumentRow[] {
	const rows: InstrumentRow[] = [];
	for (let instrument = 0; instrument < INSTRUMENT_COUNT; instrument++) {
		const bleeps: BleepEntry[] = [];
		for (let note = 0; note < NOTES_PER_INSTRUMENT; note++) {
			const id = note + instrument * NOTES_PER_INSTRUMENT;
			bleeps.push({id, owner: owners?.[id]});
		}
		rows.push({
			instrument,
			name: instrumentName(instrument),
			bleeps,
			minted: bleeps.filter((bleep) => isOwned(bleep.owner)).length,
		});
	}
	return rows;
}

/** The note and instrument a token id stands for. */
export function decomposeId(id: number): {note: number; instrument: number} {
	return {
		note: id % NOTES_PER_INSTRUMENT,
		instrument: Math.floor(id / NOTES_PER_INSTRUMENT),
	};
}

/** Whether a number is a token id that can exist. */
export function isValidBleepId(id: number): boolean {
	return (
		Number.isInteger(id) &&
		id >= 0 &&
		id < INSTRUMENT_COUNT * NOTES_PER_INSTRUMENT
	);
}
