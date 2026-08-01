/**
 * A melody is 32 steps of 16 bits, packed into two bytes32.
 *
 * Each step is `note + shape * 64 + vol * 64 * 16`, the first 16 steps in
 * `data1` and the rest in `data2`, most significant first. This mirrors what
 * MeloBleepsTokenURI reads back out, so if the packing here is wrong the
 * rendered audio is wrong rather than the call reverting.
 */
export type Step = {note: number; shape: number; vol: number};

const STEPS_PER_WORD = 16;
const BITS_PER_STEP = 16n;

function packWord(steps: Step[]): `0x${string}` {
	let value = 0n;
	steps.slice(0, STEPS_PER_WORD).forEach((step, index) => {
		const encoded = BigInt(step.note + step.shape * 64 + step.vol * 64 * 16);
		const shift = 2n ** (256n - BITS_PER_STEP - BigInt(index) * BITS_PER_STEP);
		value += encoded * shift;
	});
	return `0x${value.toString(16).padStart(64, '0')}`;
}

export function createData(steps: Step[]): {
	data1: `0x${string}`;
	data2: `0x${string}`;
} {
	return {
		data1: packWord(steps.slice(0, STEPS_PER_WORD)),
		data2: packWord(steps.slice(STEPS_PER_WORD)),
	};
}

const silence: Step = {vol: 0, note: 0, shape: 0};

/** A 32-step melody with a lead note and a bass note, as used by the tests. */
export function exampleMelody(lead: Step, bass: Step): Step[] {
	const pattern: Step[] = [
		lead,
		silence,
		lead,
		silence,
		bass,
		lead,
		silence,
		silence,
		lead,
		silence,
		silence,
		silence,
		bass,
		silence,
		lead,
		silence,
	];
	return [...pattern, ...pattern];
}
