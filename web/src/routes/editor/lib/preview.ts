import {readable, type Readable} from 'svelte/store';
import type {PublicClient} from 'viem';
import type {TypedDeployments} from '$lib/core/connection/types';
import {encodeMelodyToChainData, type MelodyInfo} from '$lib/melodies/melody';
import {parseTokenURI} from '$lib/bleeps/metadata';

/**
 * What the melody sounds like, according to the chain.
 *
 * There is no synthesiser in this app. `MeloBleepsTokenURI.tokenURI` renders the
 * WAV in Solidity and we play the result, so what the editor previews is exactly
 * what a minted token will render (asserted in the contracts suite by
 * `the preview the editor renders is what gets minted`).
 *
 * That render costs about 34M gas. It is a pure function so this is only ever an
 * `eth_call`, never a transaction, and `eth_call` is bound by the node's own gas
 * allowance rather than EIP-7825's 16,777,216 per-transaction cap. geth's default
 * is 50M, so it fits, but not by a wide margin: see
 * docs/adr/0002-melobleeps-tokenuri-gas.md. It is also why previews are
 * debounced rather than fired on every pointer move.
 */
export type PreviewState =
	| {step: 'Idle'}
	| {step: 'Rendering'}
	| {step: 'Rendered'; name: string; animationUrl: string; image: string}
	| {step: 'Failed'; message: string};

const DEBOUNCE_MS = 400;

export function createMelodyPreview(params: {
	melody: Readable<MelodyInfo>;
	publicClient: PublicClient;
	deployments: TypedDeployments;
}): Readable<PreviewState> {
	const {melody, publicClient, deployments} = params;

	return readable<PreviewState>({step: 'Idle'}, (set) => {
		let timer: ReturnType<typeof setTimeout> | undefined;
		// Bumped on every request so a slow render that lands after a newer one
		// cannot overwrite it.
		let generation = 0;

		const unsubscribe = melody.subscribe((current) => {
			if (timer) {
				clearTimeout(timer);
			}
			timer = setTimeout(async () => {
				const mine = ++generation;
				set({step: 'Rendering'});

				const {data1, data2} = encodeMelodyToChainData(current);
				try {
					const tokenURI = await publicClient.readContract({
						...deployments.contracts.MeloBleepsTokenURI,
						functionName: 'tokenURI',
						args: [data1, data2, current.speed, current.name],
					});
					if (mine !== generation) {
						return;
					}
					const metadata = parseTokenURI(tokenURI as string);
					set({
						step: 'Rendered',
						name: metadata.name,
						animationUrl: metadata.animation_url,
						image: metadata.image,
					});
				} catch (error) {
					if (mine !== generation) {
						return;
					}
					set({
						step: 'Failed',
						message:
							error instanceof Error ? error.message : 'could not render',
					});
				}
			}, DEBOUNCE_MS);
		});

		return () => {
			if (timer) {
				clearTimeout(timer);
			}
			// stop any in-flight render from being applied after teardown
			generation++;
			unsubscribe();
		};
	});
}
