import {readable, type Readable} from 'svelte/store';
import type {PublicClient} from 'viem';
import type {TypedDeployments} from '$lib/core/connection/types';
import {
	cachedBleepSound,
	fetchBleepSound,
	type BleepSound,
} from '$lib/bleeps/sound';

/**
 * One Bleep's own render, straight from the contract.
 *
 * The grid draws its 576 tiles locally from the id, because `tokenURI` costs
 * about 7.5M gas and 576 of those is not a page load. This is the authoritative
 * version, fetched only for the Bleep somebody actually opened.
 *
 * It is an `eth_call` on a view function, so the cost is the node's problem
 * rather than a user's, but it is still far above a normal read and worth being
 * deliberate about. See docs/adr/0002-melobleeps-tokenuri-gas.md.
 *
 * The fetch goes through the same cache the grid plays from, so opening the page
 * for a Bleep you just heard costs nothing at all.
 */
export type BleepState =
	| {step: 'Loading'}
	| {
			step: 'Loaded';
			name: string;
			image: string;
			animationUrl: string;
	  }
	| {step: 'Failed'; message: string};

function loaded(sound: BleepSound): BleepState {
	return {
		step: 'Loaded',
		name: sound.name,
		image: sound.image,
		animationUrl: sound.animationUrl,
	};
}

export function createBleepState(params: {
	/** Undefined for an id that cannot exist, so no call is made. */
	id: number | undefined;
	publicClient: PublicClient;
	deployments: TypedDeployments;
}): Readable<BleepState> {
	const {id, publicClient, deployments} = params;

	if (id === undefined) {
		return readable<BleepState>({
			step: 'Failed',
			message: 'There are only 576 Bleeps, numbered 0 to 575.',
		});
	}

	const already = cachedBleepSound(deployments, id);
	const initial: BleepState = already ? loaded(already) : {step: 'Loading'};

	return readable<BleepState>(initial, (set) => {
		if (already) {
			return;
		}
		let live = true;

		fetchBleepSound({publicClient, deployments, id})
			.then((sound) => {
				if (!live) {
					return;
				}
				set(loaded(sound));
			})
			.catch((error: unknown) => {
				if (!live) {
					return;
				}
				set({
					step: 'Failed',
					message:
						error instanceof Error
							? error.message
							: 'could not load this Bleep',
				});
			});

		return () => {
			live = false;
		};
	});
}
