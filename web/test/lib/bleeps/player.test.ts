import {describe, expect, it, vi} from 'vitest';
import {get} from 'svelte/store';
import {createBleepPlayer, type AudioLike} from '$lib/bleeps/player';
import type {BleepSound} from '$lib/bleeps/sound';

function soundFor(id: number): BleepSound {
	return {
		id,
		name: `bleep ${id}`,
		image: 'data:image/svg+xml;utf8,<svg/>',
		animationUrl: `data:audio/wav;base64,${id}`,
	};
}

function fakeAudio() {
	const listeners: Record<string, (() => void)[]> = {};
	const audio = {
		src: '',
		currentTime: 0,
		played: 0,
		paused: 0,
		play: vi.fn(async () => {
			audio.played++;
		}),
		pause: vi.fn(() => {
			audio.paused++;
		}),
		addEventListener: (type: string, listener: () => void) => {
			(listeners[type] ??= []).push(listener);
		},
		removeEventListener: (type: string, listener: () => void) => {
			listeners[type] = (listeners[type] ?? []).filter((l) => l !== listener);
		},
		end: () => (listeners['ended'] ?? []).forEach((l) => l()),
	};
	return audio;
}

function deferred<T>() {
	let resolve!: (value: T) => void;
	let reject!: (error: unknown) => void;
	const promise = new Promise<T>((res, rej) => {
		resolve = res;
		reject = rej;
	});
	return {promise, resolve, reject};
}

describe('the Bleep player', () => {
	it('shows a loading state while the contract renders, because it takes a moment', async () => {
		const pending = deferred<BleepSound>();
		const audio = fakeAudio();
		const player = createBleepPlayer({
			fetch: () => pending.promise,
			createAudio: () => audio as unknown as AudioLike,
		});

		const playing = player.play(3);
		expect(get(player)).toEqual({step: 'Loading', id: 3});

		pending.resolve(soundFor(3));
		await playing;
		expect(get(player)).toMatchObject({step: 'Playing', id: 3});
		expect(audio.played).toEqual(1);
	});

	it('goes back to idle when the sound ends', async () => {
		const audio = fakeAudio();
		const player = createBleepPlayer({
			fetch: async (id) => soundFor(id),
			createAudio: () => audio as unknown as AudioLike,
		});

		await player.play(3);
		audio.end();
		expect(get(player)).toEqual({step: 'Idle'});
	});

	it('plays one Bleep at a time', async () => {
		const audios = [fakeAudio(), fakeAudio()];
		let next = 0;
		const player = createBleepPlayer({
			fetch: async (id) => soundFor(id),
			createAudio: () => audios[next++] as unknown as AudioLike,
		});

		await player.play(1);
		await player.play(2);

		expect(audios[0].paused).toEqual(1);
		expect(get(player)).toMatchObject({step: 'Playing', id: 2});
	});

	it('lets the second click win, even if the first render arrives later', async () => {
		// the first fetch is the slow one; without a guard its sound would start
		// unasked once it landed, over the top of the one the user chose
		const first = deferred<BleepSound>();
		const audio = fakeAudio();
		const player = createBleepPlayer({
			fetch: (id) => (id === 1 ? first.promise : Promise.resolve(soundFor(id))),
			createAudio: () => audio as unknown as AudioLike,
		});

		const slow = player.play(1);
		await player.play(2);
		first.resolve(soundFor(1));
		await slow;

		expect(get(player)).toMatchObject({step: 'Playing', id: 2});
	});

	it('reports a render that failed', async () => {
		const player = createBleepPlayer({
			fetch: async () => {
				throw new Error('rpc refused');
			},
			createAudio: () => fakeAudio() as unknown as AudioLike,
		});

		await player.play(4);
		expect(get(player)).toEqual({
			step: 'Failed',
			id: 4,
			message: 'rpc refused',
		});
	});

	it('stops on request', async () => {
		const audio = fakeAudio();
		const player = createBleepPlayer({
			fetch: async (id) => soundFor(id),
			createAudio: () => audio as unknown as AudioLike,
		});

		await player.play(5);
		player.stop();
		expect(audio.paused).toEqual(1);
		expect(get(player)).toEqual({step: 'Idle'});
	});
});
