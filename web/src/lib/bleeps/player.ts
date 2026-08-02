import {writable, type Readable} from 'svelte/store';
import type {BleepSound} from '$lib/bleeps/sound';

/**
 * What is playing, or being waited for.
 *
 * One Bleep at a time: 576 tiles that can each start a sound would otherwise
 * pile up into noise, and the tile animation is only meaningful if it belongs to
 * the sound you can hear.
 */
export type PlayerState =
	| {step: 'Idle'}
	| {step: 'Loading'; id: number}
	| {step: 'Playing'; id: number; sound: BleepSound}
	| {step: 'Failed'; id: number; message: string};

/** The little of an HTMLAudioElement this needs, so tests can stand in for it. */
export type AudioLike = {
	play(): Promise<void> | void;
	pause(): void;
	currentTime: number;
	addEventListener(type: 'ended' | 'error', listener: () => void): void;
	removeEventListener(type: 'ended' | 'error', listener: () => void): void;
};

export type BleepPlayer = Readable<PlayerState> & {
	/** Play a Bleep, fetching its sound if this is the first time. */
	play(id: number): Promise<void>;
	stop(): void;
};

export function createBleepPlayer(params: {
	fetch: (id: number) => Promise<BleepSound>;
	createAudio?: (src: string) => AudioLike;
}): BleepPlayer {
	const {fetch} = params;
	const createAudio =
		params.createAudio ??
		((src: string) => new Audio(src) as unknown as AudioLike);

	const state = writable<PlayerState>({step: 'Idle'});

	let current: {audio: AudioLike; onEnded: () => void} | undefined;
	// Which request is the live one. A second click while the first is still
	// fetching must win, or the earlier (slower) sound would start unasked once
	// it arrived.
	let generation = 0;

	function stopAudio() {
		if (current) {
			current.audio.removeEventListener('ended', current.onEnded);
			current.audio.pause();
			current = undefined;
		}
	}

	function stop() {
		generation++;
		stopAudio();
		state.set({step: 'Idle'});
	}

	async function play(id: number): Promise<void> {
		const mine = ++generation;
		stopAudio();
		state.set({step: 'Loading', id});

		let sound: BleepSound;
		try {
			sound = await fetch(id);
		} catch (error) {
			if (mine !== generation) return;
			state.set({
				step: 'Failed',
				id,
				message:
					error instanceof Error
						? error.message
						: 'the contract could not render this Bleep',
			});
			return;
		}
		if (mine !== generation) {
			return;
		}

		const audio = createAudio(sound.animationUrl);
		const onEnded = () => {
			if (mine !== generation) return;
			stopAudio();
			state.set({step: 'Idle'});
		};
		audio.addEventListener('ended', onEnded);
		current = {audio, onEnded};
		state.set({step: 'Playing', id, sound});

		try {
			await audio.play();
		} catch {
			// Autoplay policies reject a play() that no gesture asked for. Every
			// play here follows a click, so this is rare, and a silent tile is a
			// better answer than an error the user cannot act on.
			if (mine === generation) {
				stopAudio();
				state.set({step: 'Idle'});
			}
		}
	}

	return {subscribe: state.subscribe, play, stop};
}
