import {get, writable, type Readable, type Writable} from 'svelte/store';
import type {PublicClient} from 'viem';
import type {TypedDeployments} from '$lib/core/connection/types';
import {encodeMelodyToChainData, type MelodyInfo} from './melody';
import {parseTokenURI} from '$lib/bleeps/metadata';
import {melodyRenderer} from './deployment';

/**
 * Play melodies in the browser.
 *
 * There is no synthesiser in this app: a melody's sound is the WAV the
 * `MeloBleepsTokenURI` contract renders, fetched with an `eth_call` to its
 * `tokenURI` and played through a plain `<audio>` element. That is the same
 * render the editor preview and the minted token use (see
 * `routes/editor/lib/preview.ts`), so what a visitor hears on the melodies page
 * is exactly what was composed.
 *
 * One `Audio` element is shared across the app and the player tracks the id of
 * the melody it holds, so starting one melody stops another rather than playing
 * two at once. Rendered audio URLs are cached by id, so replaying a melody does
 * not call the contract again.
 */

export type MelodyPlayPhase =
	'idle' | 'loading' | 'playing' | 'paused' | 'error';

export type MelodyPlayState = {
	/** The id of the melody the player currently holds, if any. */
	id: string | undefined;
	phase: MelodyPlayPhase;
	error?: string;
};

const state: Writable<MelodyPlayState> = writable({
	id: undefined,
	phase: 'idle',
});

// One element for the whole app, created lazily so SSR never touches `Audio`.
let audio: HTMLAudioElement | undefined;

// id -> animation_url, so a melody played twice only renders on chain once.
const cache = new Map<string, string>();

function ensureAudio(): HTMLAudioElement {
	if (!audio) {
		audio = new Audio();
		audio.addEventListener('ended', () => {
			state.update((s) =>
				s.phase === 'playing' ? {...s, phase: 'paused'} : s,
			);
		});
		audio.addEventListener('play', () => {
			state.update((s) => ({...s, phase: 'playing'}));
		});
		audio.addEventListener('pause', () => {
			state.update((s) =>
				s.phase === 'playing' ? {...s, phase: 'paused'} : s,
			);
		});
		audio.addEventListener('error', () => {
			state.update((s) => ({
				...s,
				phase: 'error',
				error: 'could not play audio',
			}));
		});
	}
	return audio;
}

/** The melody the player is currently holding, and what it is doing with it. */
export const melodyPlayer: Readable<MelodyPlayState> = state;

/**
 * Render one melody to its audio URL by asking the chain.
 *
 * Separate from playback so the editor preview can reuse the same render, and
 * so `toggleMelodyPlay` can cache the result.
 */
export async function renderMelodyAudio(params: {
	melody: MelodyInfo;
	publicClient: PublicClient;
	deployments: TypedDeployments;
}): Promise<string> {
	const {melody, publicClient, deployments} = params;
	const renderer = melodyRenderer(deployments);
	if (!renderer) {
		throw new Error('Melodies are not on this chain.');
	}
	const {data1, data2} = encodeMelodyToChainData(melody);
	const tokenURI = await publicClient.readContract({
		...renderer,
		functionName: 'tokenURI',
		args: [data1, data2, melody.speed, melody.name],
	});
	const metadata = parseTokenURI(tokenURI as string);
	return metadata.animation_url;
}

/**
 * Load `melody` into the player and start it, or pause/resume it if it is
 * already the one playing. Starting a different melody stops the current one.
 */
export async function toggleMelodyPlay(params: {
	id: string;
	melody: MelodyInfo;
	publicClient: PublicClient;
	deployments: TypedDeployments;
}): Promise<void> {
	const {id, melody, publicClient, deployments} = params;
	const a = ensureAudio();
	const current = get(state);

	// Already holding this one: toggle pause/resume (or retry after an error).
	if (current.id === id) {
		if (current.phase === 'playing') {
			a.pause();
			// the 'pause' listener sets the state
		} else if (current.phase === 'paused') {
			await a.play();
			// the 'play' listener sets the state
		} else if (current.phase === 'error') {
			await start(id, melody, publicClient, deployments);
		}
		return;
	}

	// Different melody: stop the current one and start this.
	a.pause();
	await start(id, melody, publicClient, deployments);
}

async function start(
	id: string,
	melody: MelodyInfo,
	publicClient: PublicClient,
	deployments: TypedDeployments,
): Promise<void> {
	const a = ensureAudio();
	state.set({id, phase: 'loading'});
	try {
		let url = cache.get(id);
		if (!url) {
			url = await renderMelodyAudio({melody, publicClient, deployments});
			cache.set(id, url);
		}
		a.src = url;
		await a.play();
		// the 'play' listener sets phase to 'playing'
	} catch (error) {
		state.set({
			id,
			phase: 'error',
			error: error instanceof Error ? error.message : 'could not play',
		});
	}
}

/** Stop and forget whatever is playing. */
export function stopMelody(): void {
	const a = audio;
	if (a) {
		a.pause();
		a.currentTime = 0;
	}
	state.set({id: undefined, phase: 'idle'});
}
