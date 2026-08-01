import {get, writable, type Readable, type Writable} from 'svelte/store';
import {colorFromId} from './notes.js';
import {SLOT_COUNT, type MelodyInfo, type Slot} from './melody.js';

/**
 * The editor's geometry, in SVG user units.
 *
 * The canvas is two stacked strips: volumes along the bottom, notes above,
 * separated by a gap that carries the melody's name and creator. Y is measured
 * from the BOTTOM of the canvas, which is why the volume strip is the one at low
 * y. Callers convert from client coordinates with `toCanvas`.
 */
export type Geometry = {
	volumeHeight: number;
	middleGap: number;
	slotHeight: number;
	margin: number;
	gap: number;
};

export const DEFAULT_GEOMETRY: Geometry = {
	volumeHeight: 64,
	middleGap: 64,
	slotHeight: 512,
	margin: 0,
	gap: 4,
};

export function canvasSize(geometry: Geometry): {
	width: number;
	height: number;
} {
	const height =
		geometry.slotHeight + geometry.middleGap + geometry.volumeHeight;
	// square, so a slot is as wide as the canvas divided by the slot count
	return {width: height, height};
}

export function slotWidth(geometry: Geometry): number {
	const {width} = canvasSize(geometry);
	return (width - geometry.margin) / SLOT_COUNT;
}

/**
 * Which strip a drag started in.
 *
 * Once a drag begins in one strip it stays there, so dragging across the middle
 * gap does not start rewriting notes when you meant to draw volumes.
 */
export type DrawingStrip = 'volume' | 'note';

export type EditorState = {
	drawing: DrawingStrip | undefined;
	pointerDown: boolean;
	selectedInstrument: number;
};

/** The default volume given to a slot that gets a note while silent. */
const VOLUME_FOR_NEW_NOTE = 5;

const NOTE_COUNT = 64;
const VOLUME_LEVELS = 8;

/** Bar height for a slot's note, in note units. `+1` so note 0 is still visible. */
export function heightOfNote(slot: Slot): number {
	return slot.note + 1;
}

/** Bar height for a slot's volume, in volume units. `+1` so volume 0 is visible. */
export function heightOfVolume(slot: Slot): number {
	return slot.volume + 1;
}

export function instrumentColor(instrument: number): string {
	return colorFromId(instrument << 6);
}

/** Grey ramp for the volume bars, darkest at silent. */
export function volumeColor(volume: number): string {
	const ramp = ['111', '333', '555', '777', '999', 'bbb', 'ddd'];
	return ramp[volume] ?? 'fff';
}

/**
 * Client coordinates to canvas coordinates, with y flipped so it grows upwards.
 *
 * Clamped to the element, so a drag that leaves the canvas keeps painting the
 * edge slot rather than stopping dead or jumping.
 */
export function toCanvas(
	geometry: Geometry,
	element: {clientWidth: number; clientHeight: number},
	offsetX: number,
	offsetY: number,
): {x: number; y: number} {
	const {width, height} = canvasSize(geometry);
	const clampedX = Math.min(Math.max(0, offsetX), element.clientWidth - 1);
	const clampedY = Math.min(Math.max(0, offsetY), element.clientHeight - 1);
	return {
		x: width * (clampedX / element.clientWidth),
		y: height * (1 - clampedY / element.clientHeight),
	};
}

export type MelodyEditor = Readable<EditorState> & {
	/** Begin a drag at a canvas position. */
	begin(x: number, y: number, withNote: boolean): void;
	/** Continue a drag. Does nothing unless the pointer is down. */
	move(x: number, y: number, withNote: boolean): void;
	/** End a drag, releasing the strip lock. */
	end(): void;
	selectInstrument(instrument: number): void;
	setName(name: string): void;
	setSpeed(speed: number): void;
	setSlot(index: number, slot: Partial<Slot>): void;
};

/**
 * The editing behaviour of the melody canvas, separate from how it is drawn.
 *
 * Kept out of the component so that hit-testing and the drag state machine can
 * be reasoned about and tested without a DOM, per the repo's rule that .svelte
 * files stay logic-minimal.
 */
export function createMelodyEditor(
	melody: Writable<MelodyInfo>,
	options: {geometry?: Geometry; editable?: boolean} = {},
): MelodyEditor {
	const geometry = options.geometry ?? DEFAULT_GEOMETRY;
	const editable = options.editable ?? true;

	const state = writable<EditorState>({
		drawing: undefined,
		pointerDown: false,
		selectedInstrument: 0,
	});

	function paint(x: number, y: number, withNote: boolean) {
		if (!editable) {
			return;
		}
		const current = get(state);
		const index = Math.floor((x - geometry.margin / 2) / slotWidth(geometry));
		if (index < 0 || index >= SLOT_COUNT) {
			return;
		}

		const inVolumeStrip = y < geometry.volumeHeight;
		const inNoteStrip = y > geometry.volumeHeight + geometry.middleGap;

		if (
			(current.drawing === undefined && inVolumeStrip) ||
			current.drawing === 'volume'
		) {
			state.update((s) => ({...s, drawing: 'volume'}));

			const fromTop = Math.max(0, geometry.volumeHeight - y);
			const volume = Math.min(
				VOLUME_LEVELS - 1,
				Math.floor(fromTop / (geometry.volumeHeight / VOLUME_LEVELS)),
			);
			melody.update((m) => {
				if (m.slots[index].volume === volume) {
					return m;
				}
				const slots = [...m.slots];
				slots[index] = {...slots[index], volume};
				return {...m, slots};
			});
			return;
		}

		if (
			(current.drawing === undefined && inNoteStrip) ||
			current.drawing === 'note'
		) {
			state.update((s) => ({...s, drawing: 'note'}));

			const fromBottom = Math.max(
				0,
				y - (geometry.volumeHeight + geometry.middleGap),
			);
			const note = Math.min(
				NOTE_COUNT - 1,
				Math.floor(
					(fromBottom - geometry.margin / 2) /
						(geometry.slotHeight / NOTE_COUNT),
				),
			);

			melody.update((m) => {
				const slot = m.slots[index];
				const unchanged =
					note === slot.note &&
					current.selectedInstrument === slot.instrument &&
					slot.volume !== 0;
				if (unchanged) {
					return m;
				}
				const slots = [...m.slots];
				slots[index] = {
					// Drawing a note onto a silent slot has to make it audible, or the
					// note appears and nothing plays.
					volume: slot.volume === 0 ? VOLUME_FOR_NEW_NOTE : slot.volume,
					note: withNote ? note : slot.note,
					instrument: current.selectedInstrument,
				};
				return {...m, slots};
			});
		}
	}

	return {
		subscribe: state.subscribe,

		begin(x, y, withNote) {
			if (!editable) {
				return;
			}
			state.update((s) => ({...s, pointerDown: true}));
			paint(x, y, withNote);
		},

		move(x, y, withNote) {
			if (!editable || !get(state).pointerDown) {
				return;
			}
			paint(x, y, withNote);
		},

		end() {
			state.update((s) => ({...s, pointerDown: false, drawing: undefined}));
		},

		selectInstrument(instrument) {
			state.update((s) => ({...s, selectedInstrument: instrument}));
		},

		setName(name) {
			melody.update((m) => ({...m, name}));
		},

		setSpeed(speed) {
			melody.update((m) => ({...m, speed}));
		},

		setSlot(index, slot) {
			melody.update((m) => {
				const slots = [...m.slots];
				slots[index] = {...slots[index], ...slot};
				return {...m, slots};
			});
		},
	};
}
