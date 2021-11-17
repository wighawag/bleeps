export function instrumentNameFromId(id: number): string {
  return instrumentName(id >> 6);
}

export function instrumentName(instr: number): string {
  switch (instr) {
    case 0:
      return 'TRIANGLE';
    case 1:
      return 'TILTED SAW';
    case 2:
      return 'SAW';
    case 3:
      return 'SQUARE';
    case 4:
      return 'PULSE';
    case 5:
      return 'ORGAN';
    case 6:
      return 'PHASER';
    case 7:
      return 'NOISE';
    case 8:
      return 'FUNKY SAW';
  }
  return 'NONE';
}

/*
mandala palette
#f6fe63
#fec425
#f37734
#d01141
#450a2c
#6d1b32
#c4754a
#e8caa9
#6ef043
#07bf75
#005c99
#0784aa
#30d1d1
#4817a3
#8034be
#b96ad8
*/
export function colorFromId(id: number): string {
  const instr = id >> 6;
  let color = 'f6fe63';
  if (instr == 1) {
    color = '0084db';
  } else if (instr == 2) {
    color = 'f37734';
  } else if (instr == 3) {
    color = 'd1111e';
  } else if (instr == 4) {
    color = 'ad176c';
  } else if (instr == 5) {
    color = '8034be';
  } else if (instr == 6) {
    color = '30d1b9';
  } else if (instr == 7) {
    color = 'ff69b4';
  } else if (instr == 8) {
    color = '63db3b';
  } else if (instr == 9) {
    color = '06d683';
  } else if (instr == 10) {
    color = 'fec425';
  } else if (instr == 11) {
    color = '1d9bc2';
  } else if (instr == 12) {
    color = 'ad6013';
  } else if (instr == 13) {
    color = '5118ba';
  } else if (instr == 14) {
    color = 'a82349';
  } else if (instr == 15) {
    color = 'b96ad8';
  }
  return color;
}

export function noteName(id: number): string {
  const note = id % 64;
  const m = note % 12;
  let n = m;
  if (m > 0) {
    n--;
  }
  if (m > 2) {
    n--;
  }
  if (m > 5) {
    n--;
  }
  if (m > 7) {
    n--;
  }
  if (m > 9) {
    n--;
  }
  let str = '_';
  str = String.fromCharCode(65 + ((n + 2) % 7));
  if (m == 1 || m == 3 || m == 6 || m == 8 || m == 10) {
    str += '#';
  }
  str += String.fromCharCode(50 + Math.floor(note / 12));
  return str;
}

const notes = [
  65.41, // C2
  69.3, // C#2
  73.42, // D2
  77.78, // D#2
  82.41, // E2
  87.31, // F2
  92.5, // F#2
  98.0, // G2
  103.83, // G#2
  110.0, // A2
  116.54, // A#2
  123.47, // B2
  130.81, // C3
  138.59, // C#3
  146.83, // D3
  155.56, // D#3
  164.81, // E3
  174.61, // F3
  185.0, // F#3
  196.0, // G3
  207.65, // G#3
  220.0, // A3
  233.08, // A#3
  246.94, // B3
  261.63, // C4
  277.18, // C#4
  293.66, // D4
  311.13, // D#4
  329.63, // E4
  349.23, // F4
  369.99, // F#4
  392.0, // G4
  415.3, // G#4
  440.0, // A4
  466.16, // A#4
  493.88, // B4
  523.25, // C5
  554.37, // C#5
  587.33, // D5
  622.25, // D#5
  659.25, // E5
  698.46, // F5
  739.99, // F#5
  783.99, // G5
  830.61, // G#5
  880.0, // A5
  932.33, // A#5
  987.77, // B5
  1046.5, // C6
  1108.73, // C#6
  1174.66, // D6
  1244.51, // D#6
  1318.51, // E6
  1396.91, // F6
  1479.98, // F#6
  1567.98, // G6
  1661.22, // G#6
  1760.0, // A6
  1864.66, // A#6
  1975.53, // B6
  2093.0, // C7
  2217.46, // C#7
  2349.32, // D7
  2489.02, // D#7
  2637.02, // E7
  2793.83, // F7
  2959.96, // F#7
  3135.96, // G7
  3322.44, // G#7
  3520.0, // A7
  3729.31, // A#7
  3951.07, // B7
  4186.01, // C8
  4434.92, // C#8
  4698.63, // D8
  4978.03, // D#8
  5274.04, // E8
  5587.65, // F8
  5919.91, // F#8
  6271.93, // G8
  6644.88, // G#8
  7040.0, // A8
  7458.62, // A#8
  7902.13, // B8
];

export function hertz(id: number): string {
  const note = id % 64;
  return '' + Math.floor(notes[note]) + ' Hz';
}
