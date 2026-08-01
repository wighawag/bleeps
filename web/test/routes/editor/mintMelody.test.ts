import {describe, expect, it, vi} from 'vitest';
import {readable} from 'svelte/store';
import {
	mintMelody,
	type MintMelodyDeps,
} from '../../../src/routes/editor/lib/mintMelody';
import {emptyMelody, encodeMelodyToChainData} from '$lib/melodies/melody';

const MELO = '0xaAaAaAaAaAaAaAaAaAaAaAaAaAaAaAaAaAaAaAaA' as const;
const SENDER = '0xbBbBbBbBbBbBbBbBbBbBbBbBbBbBbBbBbBbBbBbB' as const;

function audibleMelody() {
	const melody = emptyMelody();
	melody.name = ' spaced out ';
	melody.slots[3] = {note: 20, instrument: 2, volume: 5};
	return melody;
}

function deps(
	overrides: {
		writeContract?: ReturnType<typeof vi.fn>;
		ensureCanAfford?: ReturnType<typeof vi.fn>;
		executorStatus?: 'ready' | 'cannot-send' | 'not-ready';
	} = {},
) {
	const writeContract = overrides.writeContract ?? vi.fn(async () => '0xhash');
	const ensureCanAfford =
		overrides.ensureCanAfford ??
		vi.fn(async (options: any) => options.contract);
	const status = overrides.executorStatus ?? 'ready';

	return {
		writeContract,
		ensureCanAfford,
		deps: {
			connection: {ensureConnected: vi.fn(async () => {})},
			executor: readable(
				status === 'ready'
					? {
							status: 'ready',
							address: SENDER,
							account: SENDER,
							client: {writeContract},
						}
					: {status},
			),
			deployments: readable({
				contracts: {MeloBleeps: {address: MELO, abi: []}},
			}),
			balanceCheck: {ensureCanAfford},
		} as unknown as MintMelodyDeps,
	};
}

describe('mintMelody', () => {
	it('sends reserveAndMint with name, SPEED, data1, data2, to', async () => {
		const melody = audibleMelody();
		const {deps: d, ensureCanAfford} = deps();

		const result = await mintMelody(d, melody);

		expect(result).toEqual({status: 'submitted'});

		const request = ensureCanAfford.mock.calls[0][0].contract;
		expect(request.address).toEqual(MELO);
		expect(request.functionName).toEqual('reserveAndMint');

		// The argument order here is unique on this contract: every other entry
		// point takes speed LAST. Getting it wrong would mint a melody whose speed
		// and note data are swapped, which the compiler cannot catch through an
		// untyped ABI.
		const {data1, data2} = encodeMelodyToChainData({
			...melody,
			name: 'spaced out',
		});
		expect(request.args).toEqual([
			'spaced out',
			melody.speed,
			data1,
			data2,
			SENDER,
		]);
	});

	it('trims the name, so a stray space cannot squat a different one', async () => {
		const {deps: d, ensureCanAfford} = deps();

		await mintMelody(d, audibleMelody());

		expect(ensureCanAfford.mock.calls[0][0].contract.args[0]).toEqual(
			'spaced out',
		);
	});

	it('refuses a silent melody', async () => {
		const {deps: d, writeContract} = deps();

		// A silent melody would mint an inaudible token AND permanently take its
		// name: NAME_ALREADY_TAKEN can never be undone.
		const result = await mintMelody(d, emptyMelody());

		expect(result.status).toEqual('error');
		expect(writeContract).not.toHaveBeenCalled();
	});

	it('reports an account that cannot send', async () => {
		const {deps: d} = deps({executorStatus: 'cannot-send'});
		expect(await mintMelody(d, audibleMelody())).toEqual({
			status: 'cannot-send',
		});
	});

	it('treats a not-ready executor as a cancellation', async () => {
		const {deps: d} = deps({executorStatus: 'not-ready'});
		expect(await mintMelody(d, audibleMelody())).toEqual({
			status: 'cancelled',
		});
	});

	it('surfaces a real failure with details', async () => {
		const writeContract = vi.fn(async () => {
			throw new Error('execution reverted: NAME_ALREADY_TAKEN');
		});
		const {deps: d} = deps({writeContract});

		const result = await mintMelody(d, audibleMelody());

		expect(result.status).toEqual('error');
		if (result.status === 'error') {
			expect(result.message.length).toBeGreaterThan(0);
			expect(result.details.length).toBeGreaterThan(0);
		}
	});
});
