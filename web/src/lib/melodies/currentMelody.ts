import {writable} from 'svelte/store';

export type Slot = {volume: number; note: number; instrument: number};

export type Slots = [
  Slot,
  Slot,
  Slot,
  Slot,
  Slot,
  Slot,
  Slot,
  Slot,
  Slot,
  Slot,
  Slot,
  Slot,
  Slot,
  Slot,
  Slot,
  Slot,
  Slot,
  Slot,
  Slot,
  Slot,
  Slot,
  Slot,
  Slot,
  Slot,
  Slot,
  Slot,
  Slot,
  Slot,
  Slot,
  Slot,
  Slot,
  Slot
];

export type MelodyInfo = {
  name: string;
  slots: Slots;
};

export const currentMelody = writable({
  name: 'untitled',
  slots: [
    {volume: 7, note: 1, instrument: 8},
    {volume: 0, note: 0, instrument: 0},
    {volume: 7, note: 1, instrument: 8},
    {volume: 0, note: 0, instrument: 0},
    {volume: 5, note: 63, instrument: 7},
    {volume: 7, note: 1, instrument: 8},
    {volume: 0, note: 0, instrument: 0},
    {volume: 0, note: 0, instrument: 0},
    {volume: 7, note: 1, instrument: 8},
    {volume: 0, note: 0, instrument: 0},
    {volume: 0, note: 0, instrument: 0},
    {volume: 0, note: 0, instrument: 0},
    {volume: 5, note: 63, instrument: 7},
    {volume: 0, note: 0, instrument: 0},
    {volume: 7, note: 1, instrument: 8},
    {volume: 0, note: 0, instrument: 0},
    {volume: 7, note: 1, instrument: 8},
    {volume: 0, note: 0, instrument: 0},
    {volume: 7, note: 1, instrument: 8},
    {volume: 0, note: 0, instrument: 0},
    {volume: 5, note: 63, instrument: 7},
    {volume: 7, note: 1, instrument: 8},
    {volume: 0, note: 0, instrument: 0},
    {volume: 0, note: 0, instrument: 0},
    {volume: 7, note: 1, instrument: 8},
    {volume: 0, note: 0, instrument: 0},
    {volume: 0, note: 0, instrument: 0},
    {volume: 0, note: 0, instrument: 0},
    {volume: 5, note: 63, instrument: 7},
    {volume: 0, note: 0, instrument: 0},
    {volume: 7, note: 1, instrument: 8},
    {volume: 5, note: 63, instrument: 7},
  ],
});
