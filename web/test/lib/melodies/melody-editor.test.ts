import {describe, expect, it} from 'vitest';
import {get, writable} from 'svelte/store';
import {emptyMelody, type MelodyInfo} from '$lib/melodies/melody';
import {
	DEFAULT_GEOMETRY,
	canvasSize,
	createMelodyEditor,
	heightOfNote,
	heightOfVolume,
	slotWidth,
	toCanvas,
	volumeColor,
} from '$lib/melodies/melody-editor';

const {volumeHeight, middleGap, slotHeight} = DEFAULT_GEOMETRY;

/** Canvas y for a note bar of the given note value, in the note strip. */
function yForNote(note: number): number {
	return volumeHeight + middleGap + (note + 0.5) * (slotHeight / 64);
}

/** Canvas y for the given volume, in the volume strip. */
function yForVolume(volume: number): number {
	return volumeHeight - (volume + 0.5) * (volumeHeight / 8);
}

function xForSlot(index: number): number {
	return (index + 0.5) * slotWidth(DEFAULT_GEOMETRY);
}

function setup(melody: MelodyInfo = emptyMelody()) {
	const store = writable(melody);
	return {store, editor: createMelodyEditor(store)};
}

describe('geometry', () => {
	it('is square, and a slot is a 32nd of it', () => {
		const {width, height} = canvasSize(DEFAULT_GEOMETRY);
		expect(width).toEqual(height);
		expect(slotWidth(DEFAULT_GEOMETRY)).toEqual(width / 32);
	});

	it('flips y so it grows upwards', () => {
		const element = {clientWidth: 100, clientHeight: 100};
		const {height} = canvasSize(DEFAULT_GEOMETRY);

		const atTop = toCanvas(DEFAULT_GEOMETRY, element, 0, 0).y;
		const atBottom = toCanvas(DEFAULT_GEOMETRY, element, 0, 99).y;

		expect(atTop).toBeCloseTo(height, 0);
		expect(atBottom).toBeLessThan(atTop);
		// the last row is clamped to clientHeight - 1, so the bottom lands just
		// inside the canvas rather than exactly on zero
		expect(atBottom).toBeGreaterThanOrEqual(0);
		expect(atBottom).toBeLessThan(height / 32);
	});

	it('clamps a pointer that has left the canvas', () => {
		const element = {clientWidth: 100, clientHeight: 100};
		const {width} = canvasSize(DEFAULT_GEOMETRY);

		expect(toCanvas(DEFAULT_GEOMETRY, element, -50, 50).x).toEqual(0);

		// clamped to clientWidth - 1, so it stays strictly inside: the point is
		// that a drag off the right edge keeps painting the last slot rather than
		// addressing a slot that does not exist
		const atRight = toCanvas(DEFAULT_GEOMETRY, element, 500, 50).x;
		expect(atRight).toBeLessThan(width);
		expect(atRight).toBeGreaterThan(width - slotWidth(DEFAULT_GEOMETRY));
	});

	it('keeps a silent or lowest slot visible', () => {
		// +1 so that note 0 and volume 0 still draw a bar rather than nothing
		expect(heightOfNote({note: 0, volume: 0, instrument: 0})).toEqual(1);
		expect(heightOfVolume({note: 0, volume: 0, instrument: 0})).toEqual(1);
	});

	it('ramps the volume colour from dark to light', () => {
		expect(volumeColor(0)).toEqual('111');
		expect(volumeColor(7)).toEqual('fff');
		// out of range still gives something drawable
		expect(volumeColor(99)).toEqual('fff');
	});
});

describe('drawing notes', () => {
	it('sets the note of the slot under the pointer', () => {
		const {store, editor} = setup();

		editor.begin(xForSlot(3), yForNote(40), true);

		expect(get(store).slots[3].note).toEqual(40);
		expect(get(store).slots.filter((s) => s.note !== 0)).toHaveLength(1);
	});

	it('makes a silent slot audible when a note is drawn on it', () => {
		const {store, editor} = setup();
		expect(get(store).slots[3].volume).toEqual(0);

		editor.begin(xForSlot(3), yForNote(40), true);

		// a note that cannot be heard is not what the user asked for
		expect(get(store).slots[3].volume).toBeGreaterThan(0);
	});

	it('leaves an existing volume alone', () => {
		const melody = emptyMelody();
		melody.slots[3] = {note: 0, volume: 2, instrument: 0};
		const {store, editor} = setup(melody);

		editor.begin(xForSlot(3), yForNote(40), true);

		expect(get(store).slots[3].volume).toEqual(2);
	});

	it('applies the selected instrument', () => {
		const {store, editor} = setup();
		editor.selectInstrument(5);

		editor.begin(xForSlot(0), yForNote(10), true);

		expect(get(store).slots[0].instrument).toEqual(5);
	});

	it('changes only the instrument when the note is held back', () => {
		const melody = emptyMelody();
		melody.slots[0] = {note: 30, volume: 4, instrument: 0};
		const {store, editor} = setup(melody);
		editor.selectInstrument(2);

		// `withNote: false` is the shift-drag case: repaint the instrument across
		// slots without flattening their notes
		editor.begin(xForSlot(0), yForNote(10), false);

		expect(get(store).slots[0].note).toEqual(30);
		expect(get(store).slots[0].instrument).toEqual(2);
	});
});

describe('drawing volumes', () => {
	it('sets the volume of the slot under the pointer', () => {
		const {store, editor} = setup();

		editor.begin(xForSlot(7), yForVolume(6), true);

		expect(get(store).slots[7].volume).toEqual(6);
		expect(get(store).slots[7].note).toEqual(0);
	});

	it('can silence a slot', () => {
		const melody = emptyMelody();
		melody.slots[7] = {note: 12, volume: 5, instrument: 1};
		const {store, editor} = setup(melody);

		editor.begin(xForSlot(7), yForVolume(0), true);

		expect(get(store).slots[7].volume).toEqual(0);
	});
});

describe('the drag state machine', () => {
	it('ignores movement until the pointer goes down', () => {
		const {store, editor} = setup();

		editor.move(xForSlot(3), yForNote(40), true);

		expect(get(store)).toEqual(emptyMelody());
	});

	it('paints across slots while dragging', () => {
		const {store, editor} = setup();

		editor.begin(xForSlot(0), yForNote(20), true);
		editor.move(xForSlot(1), yForNote(20), true);
		editor.move(xForSlot(2), yForNote(20), true);

		expect(
			get(store)
				.slots.slice(0, 3)
				.map((s) => s.note),
		).toEqual([20, 20, 20]);
	});

	it('stays in the strip the drag started in', () => {
		const melody = emptyMelody();
		melody.slots[1] = {note: 42, volume: 5, instrument: 3};
		const {store: store2, editor: editor2} = setup(melody);

		// start in the volume strip, then drag up into the note strip. The note must
		// not change, or drawing a volume ramp silently rewrites the melody.
		editor2.begin(xForSlot(0), yForVolume(3), true);
		editor2.move(xForSlot(1), yForNote(50), true);

		expect(get(store2).slots[1].note).toEqual(42);
		expect(get(store2).slots[1].instrument).toEqual(3);
		// Dragging above the strip pins the volume to zero, which is how a slot gets
		// silenced. Faithful to the pre-template editor.
		expect(get(store2).slots[1].volume).toEqual(0);
	});

	it('releases the strip lock on pointer up', () => {
		const {store, editor} = setup();

		editor.begin(xForSlot(0), yForVolume(3), true);
		editor.end();
		editor.begin(xForSlot(1), yForNote(50), true);

		expect(get(store).slots[1].note).toEqual(50);
	});

	it('ignores a pointer outside the slot range', () => {
		const {store, editor} = setup();
		const {width} = canvasSize(DEFAULT_GEOMETRY);

		editor.begin(width + 100, yForNote(20), true);

		expect(get(store)).toEqual(emptyMelody());
	});

	it('does nothing at all when not editable', () => {
		const store = writable(emptyMelody());
		const editor = createMelodyEditor(store, {editable: false});

		editor.begin(xForSlot(3), yForNote(40), true);
		editor.move(xForSlot(4), yForNote(40), true);

		expect(get(store)).toEqual(emptyMelody());
	});
});

describe('metadata', () => {
	it('sets the name and speed', () => {
		const {store, editor} = setup();

		editor.setName('a tune');
		editor.setSpeed(24);

		expect(get(store).name).toEqual('a tune');
		expect(get(store).speed).toEqual(24);
	});

	it('sets one slot directly, for the table view', () => {
		const {store, editor} = setup();

		editor.setSlot(9, {note: 33, volume: 6});

		expect(get(store).slots[9]).toEqual({note: 33, volume: 6, instrument: 0});
	});
});
