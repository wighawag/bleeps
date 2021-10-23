function floor(x) {
  return Math.floor(x);
  // return x;
}

const ZERO = 0;
const ONE = 1000000;
const TWO = 2 * ONE;
const HALF = floor(0.5 * ONE);
const ZERO7 = floor(0.7 * ONE);
const ZERO3 = floor(0.3 * ONE);
const ZERO1 = floor(0.1 * ONE);
const ZERO3125 = floor(0.3125 * ONE);
const ZERO8750 = floor(0.875 * ONE);
const MINUS_ONE = -ONE;

const MIN_VALUE = floor(MINUS_ONE + ONE / 100000000);
const MAX_VALUE = floor(ONE - ONE / 100000000);

let b0 = 0;
let b1 = 0;
let b2 = 0;
let b3 = 0;
let b4 = 0;
let b5 = 0;
let b6 = 0;
function noise() {
  // const scale = (x - lastx) / tscale
  const white = Math.random() * TWO - ONE;
  b0 = 0.99886 * b0 + white * 0.0555179;
  b1 = 0.99332 * b1 + white * 0.0750759;
  b2 = 0.969 * b2 + white * 0.153852;
  b3 = 0.8665 * b3 + white * 0.3104856;
  b4 = 0.55 * b4 + white * 0.5329522;
  b5 = -0.7616 * b5 - white * 0.016898;
  b6 = white * 0.115926;
  return floor((b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.16);
}

const samples = [];
for (let i = 0; i < 3000; i++) {
  const n = noise() + ONE;
  console.log(n);
  samples.push(n);
}

let hexString = 'hex"';
for (const sample of samples) {
  hexString += sample.toString(16).padStart(6, '0');
}
hexString += '"';

console.log(hexString);
