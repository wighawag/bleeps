import type {MelodyInfo, Slot, Slots} from '$lib/melodies/currentMelody';

/*
The byte values (hex digit pairs, MSB) are as follows:

byte 0: The editor mode: 0 for pitch mode, 1 for note entry mode.
byte 1: The note duration, in multiples of 1/128 second.
byte 2: Loop range start, as a note number (0-63).
byte 3: Loop range end, as a note number (0-63).
bytes 4-84: 32 notes
Each note is represented by 20 bits = 5 nybbles = 5 hex digits. (Two notes use five bytes.) The nybbles are:

nybble 0-1: pitch (0-63): c-0 to d#-5, chromatic scale
nybble 2: waveform (0-F): 0 sine, 1 triangle, 2 sawtooth, 3 long square, 4 short square, 5 ringing, 6 noise, 7 ringing sine; 8-F are the custom waveforms corresponding to sound effects 0 through 7 (PICO-8 0.1.11 "version 11" and later)
nybble 3: volume (0-7)
nybble 4: effect (0-7): 0 none, 1 slide, 2 vibrato, 3 drop, 4 fade_in, 5 fade_out, 6 arp fast, 7 arp slow; arpeggio commands loop over groups of four notes at speed 2 (fast) and 4 (slow)
*/
function parseMelody(line: string): MelodyInfo {
  const speed = parseInt(line.substr(2, 2), 16);
  // let loop: {end: number; start?: number} | undefined;
  // const loopStart = parseInt(line.substr(4, 2), 16);
  // const loopEnd = parseInt(line.substr(6, 2), 16);
  // if (loopEnd != 0) {
  //   loop = {end: loopEnd, start: loopStart};
  // }
  const slots: Slot[] = [];
  for (let i = 8; i < 168; i += 5) {
    const pitch = parseInt(line.substr(i, 2), 16);
    const shape = parseInt(line.substr(i + 2, 1), 16);
    const volume = parseInt(line.substr(i + 3, 1), 16);
    // const sfx = parseInt(line.substr(i + 4, 1), 16);
    let instrument = shape;
    if (shape === 6) {
      instrument = 7;
    } else if (shape === 7) {
      instrument = 6;
    }
    slots.push({note: pitch, instrument, volume});
  }
  return {
    slots: slots as Slots,
    speed,
    name: 'untitled',
  };
}

export function importMelodiesFromPico8String(data: string): MelodyInfo[] {
  let mode: 'SFX' | 'MUSIC' | undefined;
  const melodies: MelodyInfo[] = [];
  const lines = data.split(/\r?\n/);
  for (const line of lines) {
    if (line === '__sfx__') {
      mode = 'SFX';
    } else if (line === '__music__') {
      mode = 'MUSIC';
    } else if (line.startsWith('__') || line === '') {
      mode === undefined;
    } else {
      if (mode === 'SFX') {
        melodies.push(parseMelody(line));
      }
    }
  }
  return melodies;
}
