import {writable} from 'svelte/store';
import * as base64 from '@ethersproject/base64';
import {hexlify} from '@ethersproject/bytes';
import {decodeNote, encodeNote} from '$lib/utils/notes';
import {BigNumber} from '@ethersproject/bignumber';
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
  speed: number;
};

export function encodeMelodyToString(melody: MelodyInfo): string {
  const data1 =
    '0x' +
    melody.slots
      .slice(0, 16)
      .reduce((prev, curr, index) => encodeNote(prev, {...curr, index}), BigNumber.from(0))
      .toHexString()
      .slice(2)
      .padStart(64, '0');
  const data2 =
    '0x' +
    melody.slots
      .slice(16)
      .reduce((prev, curr, index) => encodeNote(prev, {...curr, index}), BigNumber.from(0))
      .toHexString()
      .slice(2)
      .padStart(64, '0');
  const bytes = data1.concat(data2.slice(2)).concat(melody.speed.toString(16).padStart(2, '0'));

  return `${melody.name.replace(/ /g, '_')}~${base64.encode(bytes)}`;
}

// https://stackoverflow.com/a/12686857
function splitNChars(txt: string, num: number): string[] {
  const result = [];
  for (let i = 0; i < txt.length; i += num) {
    result.push(txt.substr(i, num));
  }
  return result;
}

// 0x155f095f155f095f155f095f155a095a155c095c1414081414171418141b081e141f0822142508281429096115610961155f155f155f155f155f0d5f095f015f10
export function decodeMelodyFromString(melodyString: string): MelodyInfo {
  const [nameStr, bytes64] = melodyString.split('~');
  const bytes = hexlify(base64.decode(bytes64));
  const slotStrings = splitNChars(bytes.slice(2, 130), 4);
  const slots: Slot[] = [];
  for (const slotString of slotStrings) {
    slots.push(decodeNote(BigNumber.from('0x' + slotString)));
  }

  const speed = parseInt(bytes.slice(130, 132), 16);

  return {slots: slots as Slots, speed, name: nameStr.replace(/_/g, ' ')};
}

const defaultMelody: MelodyInfo = {
  name: 'untitled',
  // slots: [
  //   {volume: 7, note: 1, instrument: 8},
  //   {volume: 0, note: 0, instrument: 0},
  //   {volume: 7, note: 1, instrument: 8},
  //   {volume: 0, note: 0, instrument: 0},
  //   {volume: 5, note: 63, instrument: 7},
  //   {volume: 7, note: 1, instrument: 8},
  //   {volume: 0, note: 0, instrument: 0},
  //   {volume: 0, note: 0, instrument: 0},
  //   {volume: 7, note: 1, instrument: 8},
  //   {volume: 0, note: 0, instrument: 0},
  //   {volume: 0, note: 0, instrument: 0},
  //   {volume: 0, note: 0, instrument: 0},
  //   {volume: 5, note: 63, instrument: 7},
  //   {volume: 0, note: 0, instrument: 0},
  //   {volume: 7, note: 1, instrument: 8},
  //   {volume: 0, note: 0, instrument: 0},
  //   {volume: 7, note: 1, instrument: 8},
  //   {volume: 0, note: 0, instrument: 0},
  //   {volume: 7, note: 1, instrument: 8},
  //   {volume: 0, note: 0, instrument: 0},
  //   {volume: 5, note: 63, instrument: 7},
  //   {volume: 7, note: 1, instrument: 8},
  //   {volume: 0, note: 0, instrument: 0},
  //   {volume: 0, note: 0, instrument: 0},
  //   {volume: 7, note: 1, instrument: 8},
  //   {volume: 0, note: 0, instrument: 0},
  //   {volume: 0, note: 0, instrument: 0},
  //   {volume: 0, note: 0, instrument: 0},
  //   {volume: 5, note: 63, instrument: 7},
  //   {volume: 0, note: 0, instrument: 0},
  //   {volume: 7, note: 1, instrument: 8},
  //   {volume: 5, note: 63, instrument: 7},
  // ],
  slots: [
    {volume: 0, note: 0, instrument: 0},
    {volume: 0, note: 0, instrument: 0},
    {volume: 0, note: 0, instrument: 0},
    {volume: 0, note: 0, instrument: 0},
    {volume: 0, note: 0, instrument: 0},
    {volume: 0, note: 0, instrument: 0},
    {volume: 0, note: 0, instrument: 0},
    {volume: 0, note: 0, instrument: 0},
    {volume: 0, note: 0, instrument: 0},
    {volume: 0, note: 0, instrument: 0},
    {volume: 0, note: 0, instrument: 0},
    {volume: 0, note: 0, instrument: 0},
    {volume: 0, note: 0, instrument: 0},
    {volume: 0, note: 0, instrument: 0},
    {volume: 0, note: 0, instrument: 0},
    {volume: 0, note: 0, instrument: 0},
    {volume: 0, note: 0, instrument: 0},
    {volume: 0, note: 0, instrument: 0},
    {volume: 0, note: 0, instrument: 0},
    {volume: 0, note: 0, instrument: 0},
    {volume: 0, note: 0, instrument: 0},
    {volume: 0, note: 0, instrument: 0},
    {volume: 0, note: 0, instrument: 0},
    {volume: 0, note: 0, instrument: 0},
    {volume: 0, note: 0, instrument: 0},
    {volume: 0, note: 0, instrument: 0},
    {volume: 0, note: 0, instrument: 0},
    {volume: 0, note: 0, instrument: 0},
    {volume: 0, note: 0, instrument: 0},
    {volume: 0, note: 0, instrument: 0},
    {volume: 0, note: 0, instrument: 0},
    {volume: 0, note: 0, instrument: 0},
  ],

  speed: 16,
};

export const currentMelody = writable(defaultMelody);
