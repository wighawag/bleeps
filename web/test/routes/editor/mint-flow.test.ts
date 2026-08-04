import {describe, expect, it, vi, beforeEach} from 'vitest';
import {get} from 'svelte/store';
import {emptyMelody} from '$lib/melodies/melody';
import type {MintMelodyResult} from '../../../src/routes/editor/lib/mintMelody';

const mintMelody = vi.hoisted(() => vi.fn());
vi.mock('../../../src/routes/editor/lib/mintMelody', () => ({mintMelody}));

const {createMintFlow} =
	await import('../../../src/routes/editor/lib/mint-flow');

function melody(name = 'Chiptune') {
	const m = emptyMelody();
	m.name = name;
	m.slots[0] = {note: 20, instrument: 1, volume: 5};
	return m;
}

function flow(
	overrides: {onSubmitted?: () => void; onCannotSend?: () => void} = {},
) {
	return createMintFlow({
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		deps: {} as any,
		onSubmitted: overrides.onSubmitted ?? vi.fn(),
		onCannotSend: overrides.onCannotSend ?? vi.fn(),
	});
}

function resolvesWith(result: MintMelodyResult) {
	mintMelody.mockResolvedValue(result);
}

beforeEach(() => {
	mintMelody.mockReset();
});

describe('createMintFlow', () => {
	it('starts closed and asks before claiming a name', () => {
		const f = flow();
		expect(get(f).step).toEqual('closed');

		f.open(melody());
		const state = get(f);
		expect(state.step).toEqual('confirming');
		if (state.step === 'confirming') {
			expect(state.melody.name).toEqual('Chiptune');
		}
	});

	it('mints what was confirmed, not what the editor holds now', async () => {
		// The dialog snapshots the melody, so an edit landing underneath a mint in
		// flight cannot change what gets sent.
		const f = flow();
		const original = melody();
		f.open(original);
		original.name = 'edited afterwards';

		resolvesWith({status: 'submitted'});
		await f.confirm();

		expect(mintMelody.mock.calls[0][1].name).toEqual('Chiptune');
	});

	it('closes and reports success when the transaction is away', async () => {
		const onSubmitted = vi.fn();
		const f = flow({onSubmitted});
		f.open(melody());

		resolvesWith({status: 'submitted'});
		await f.confirm();

		expect(get(f).step).toEqual('closed');
		expect(onSubmitted).toHaveBeenCalled();
	});

	it('shows the problem instead of a toast when the name is taken', async () => {
		const f = flow();
		f.open(melody());

		resolvesWith({
			status: 'error',
			code: 'name-taken',
			message: '"Chiptune" is already taken',
			explanation: 'pick another',
			details: 'raw error text',
		});
		await f.confirm();

		const state = get(f);
		expect(state.step).toEqual('failed');
		if (state.step === 'failed') {
			expect(state.problem.code).toEqual('name-taken');
			expect(state.details).toEqual('raw error text');
		}
	});

	it('returns to the confirmation when the wallet was refused, not to an error', async () => {
		// Rejecting in the wallet is a decision, not a failure: there is nothing to
		// explain and the composer may well hit mint again.
		const f = flow();
		f.open(melody());

		resolvesWith({status: 'cancelled'});
		await f.confirm();

		expect(get(f).step).toEqual('confirming');
	});

	it('hands an account that cannot send to the caller and closes', async () => {
		const onCannotSend = vi.fn();
		const f = flow({onCannotSend});
		f.open(melody());

		resolvesWith({status: 'cannot-send'});
		await f.confirm();

		expect(onCannotSend).toHaveBeenCalled();
		expect(get(f).step).toEqual('closed');
	});

	it('can retry after a failure without reopening', async () => {
		const f = flow();
		f.open(melody());

		resolvesWith({
			status: 'error',
			code: 'unknown',
			message: 'the RPC fell over',
			explanation: 'try again',
			details: 'raw',
		});
		await f.confirm();
		expect(get(f).step).toEqual('failed');

		resolvesWith({status: 'submitted'});
		await f.confirm();
		expect(get(f).step).toEqual('closed');
	});

	it('does nothing when confirmed while closed', async () => {
		const f = flow();
		await f.confirm();
		expect(mintMelody).not.toHaveBeenCalled();
	});
});
