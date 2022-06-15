import {writable} from 'svelte/store';
import * as base64 from '@ethersproject/base64';
import {hexlify} from '@ethersproject/bytes';
import {decodeNote, encodeNote} from '$lib/utils/notes';
import {BigNumber} from '@ethersproject/bignumber';
import type {Melody} from '$lib/stores/melodies';
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

function hexToBinary(hex: string): string {
  hex = hex.slice(2);
  let binary = '';
  let remainingSize = hex.length;
  for (let p = 0; p < hex.length / 8; p++) {
    //In case remaining hex length (or initial) is not multiple of 8
    const blockSize = remainingSize < 8 ? remainingSize : 8;

    binary += parseInt(hex.substr(p * 8, blockSize), 16)
      .toString(2)
      .padStart(blockSize * 4, '0');

    remainingSize -= blockSize;
  }
  return binary;
}

export function encodeMelodyTo232Bytes(melody: MelodyInfo): [string, string] {
  const nums = [BigNumber.from(melody.speed).shl(248), BigNumber.from(0)];
  for (let i = 0; i < 32; i++) {
    const slot = melody.slots[i];
    let dataIndex = 0;
    let shift = (15 - i) * 13;
    if (i >= 16) {
      dataIndex = 1;
      shift = (31 - i) * 13;
    }
    let num = nums[dataIndex];
    const valueas13Bits = slot.note + slot.instrument * 64 + slot.volume * 64 * 16;
    num = num.or(BigNumber.from(valueas13Bits).shl(shift));
    nums[dataIndex] = num;
  }

  return [
    '0x' + nums[0].toHexString().slice(2).padStart(64, '0'),
    '0x' + nums[1].toHexString().slice(2).padStart(64, '0'),
  ];
}

export function encodeMelodyToString(melody: MelodyInfo): string {
  // const buffer = new ArrayBuffer(Math.ceil((13 * 32) / 8) + 1);
  // const view = new Uint8Array(buffer);

  // view[0] = melody.speed;
  // let bitCounter = 8;
  // for (let i = 0; i < 32; i++) {
  //   const slot = melody.slots[i];
  //   const value = slot.note + slot.instrument * 64 + slot.volume * 64 * 16;
  //   let bitOffset = bitCounter % 8;
  //   let fed = 0;
  //   while (fed != 13) {
  //     const byteCounter = Math.floor(bitCounter / 8);
  //     view[byteCounter] |= (value >> bitOffset) % 256;
  //     const bitUSed = 13 - bitOffset;
  //     fed += bitUSed;
  //     bitCounter += bitUSed;
  //     bitOffset += bitUSed;
  //   }
  // }

  // const nums = [BigNumber.from(melody.speed).shl(248), BigNumber.from(0)];
  // for (let i = 0; i < 32; i++) {
  //   const slot = melody.slots[i];
  //   let dataIndex = 0;
  //   let shift = (15 - i) * 13;
  //   if (i >= 16) {
  //     dataIndex = 1;
  //     shift = (31 - i) * 13;
  //   }
  //   let num = nums[dataIndex];
  //   const valueas13Bits = slot.note + slot.instrument * 64 + slot.volume * 64 * 16;
  //   num = num.or(BigNumber.from(valueas13Bits).shl(shift));
  //   nums[dataIndex] = num;
  // }

  // console.log({num1: nums[0].toHexString(), num2: nums[1].toHexString()});

  // console.log({num1: hexToBinary(nums[0].toHexString()), num2: hexToBinary(nums[1].toHexString())});

  // const bytes =
  //   '0x' + nums[0].toHexString().slice(2).padStart(64, '0').concat(nums[1].toHexString().slice(2).padStart(64, '0'));

  // console.log({bytes});
  // // return `${melody.name.replace(/ /g, '_')}~${base64.encode(bytes)}`;

  // // remove speed and compress the 2 32bytes into 26bytes
  // const compressedBytes =
  //   '0x' +
  //   nums[0]
  //     .sub(BigNumber.from(melody.speed).shl(248))
  //     .toHexString()
  //     .slice(2)
  //     .padStart(52, '0')
  //     .concat(nums[1].toHexString().slice(2).padStart(52, '0'));

  const [data1, data2] = encodeMelodyTo232Bytes(melody);
  const compressedBytes =
    '0x' +
    BigNumber.from(data1)
      .sub(BigNumber.from(melody.speed).shl(248))
      .toHexString()
      .slice(2)
      .padStart(52, '0')
      .concat(BigNumber.from(data2).toHexString().slice(2).padStart(52, '0'));

  console.log(splitNChars(hexToBinary(compressedBytes), 13).join(`\n`));

  return `${melody.name.replace(/ /g, '_')}~${melody.speed}~${base64.encode(compressedBytes)}`;
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
  // const [nameStr, bytes64] = melodyString.split('~');
  // const bytes = base64.decode(bytes64);
  // const slots: Slot[] = [];
  // for (let bitCounter = 8; bitCounter < 13 * 32 + 8; bitCounter += 13) {
  //   let fed = 0;
  //   let value = 0;
  //   let bitOffset = 0;
  //   while (fed != 13) {
  //     const byteCounter = Math.floor(bitCounter / 8);
  //     const bitDiscarded = bitCounter % 8;
  //     bitOffset = bitOffset + bitDiscarded;
  //     value |= bytes[byteCounter] << bitOffset;
  //     const bitUSed = 8 - bitDiscarded;
  //     fed += bitUSed;
  //     bitCounter += bitUSed;
  //   }
  //   const note = value % 64;
  //   const instrument = (value >> 6) % 16;
  //   const volume = (value >> 10) % 8;
  //   slots.push({note, volume, instrument});
  // }
  // const speed = bytes[0];

  // return {slots: slots as Slots, speed, name: nameStr.replace(/_/g, ' ')};

  const [nameStr, speedStr, bytes64] = melodyString.split('~');
  const speed = parseInt(speedStr);
  const name = nameStr.replace(/_/g, ' ');
  const bytes = hexlify(base64.decode(bytes64));

  const slots: Slot[] = [];
  // compressed
  const nums = [BigNumber.from(bytes.slice(0, 54)), BigNumber.from('0x' + bytes.slice(54))];

  for (let i = 0; i < 32; i++) {
    let dataIndex = 0;
    let shift = (15 - i) * 13;
    if (i >= 16) {
      dataIndex = 1;
      shift = (31 - i) * 13;
    }
    const num = nums[dataIndex];
    const valueas13Bits = num.shr(shift).and('0x1fff').toNumber();
    const note = valueas13Bits % 64;
    const instrument = (valueas13Bits >> 6) % 16;
    const volume = (valueas13Bits >> 10) % 8;
    slots.push({note, volume, instrument});
  }

  return {slots: slots as Slots, speed, name};
}

/*
$: data1 =
    '0x' +
    $currentMelody.slots
      .slice(0, 16)
      .reduce((prev, curr, index) => encodeNote(prev, {...curr, index}), BigNumber.from(0))
      .toHexString()
      .slice(2)
      .padStart(64, '0');
  $: data2 =
    '0x' +
    $currentMelody.slots
      .slice(16)
      .reduce((prev, curr, index) => encodeNote(prev, {...curr, index}), BigNumber.from(0))
      .toHexString()
      .slice(2)
      .padStart(64, '0');

*/
export function decodeMelodyFromData(melody: Melody): MelodyInfo {
  const speed = melody.speed;
  const name = melody.name;
  const bytes = melody.data1 + melody.data2.slice(2);

  const slots: Slot[] = [];

  for (let i = 0; i < 32; i++) {
    const noteDataString = bytes.slice(2 + i * 4, 2 + i * 4 + 4);
    const valueas13Bits = BigNumber.from('0x' + noteDataString)
      .and('0x1fff')
      .toNumber();
    const note = valueas13Bits % 64;
    const instrument = (valueas13Bits >> 6) % 16;
    const volume = (valueas13Bits >> 10) % 8;
    slots.push({note, volume, instrument});
  }

  return {slots: slots as Slots, speed, name};
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
