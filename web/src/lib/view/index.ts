import {derived, type Readable} from 'svelte/store';
import type {BleepsState, OnchainStateStore} from '$lib/onchain/state';

/**
 * The Bleeps world as the user should see it right now.
 *
 * For the moment this is the last confirmed chain read, unchanged. Once minting
 * and melody flows go through the executor this is where in-flight operations
 * get folded in, the way mandalas overlays pending mints on its curve, so that a
 * purchase does not look inert until the next poll lands.
 */
export type BleepsView = BleepsState & {
	/** How many of the 576 have an owner. */
	minted: number;
};

export type ViewStateValue =
	{step: 'Unloaded'} | {step: 'Loaded'; bleeps: BleepsView};

export type ViewStateStatus = {
	loading: boolean;
	error?: {message: string};
	lastSuccessfulFetch?: number;
};

export type ViewStateStore = {
	subscribe: Readable<ViewStateValue>['subscribe'];
	status: Readable<ViewStateStatus>;
};

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';

export function createViewState(params: {
	onchainState: OnchainStateStore;
}): ViewStateStore {
	const {onchainState} = params;

	const store: Readable<ViewStateValue> = derived(
		onchainState,
		($onchainState): ViewStateValue => {
			if ($onchainState.step === 'Unloaded') {
				return {step: 'Unloaded'};
			}
			const {owners, treasury} = $onchainState;
			return {
				step: 'Loaded',
				bleeps: {
					owners,
					treasury,
					minted: owners.filter(
						(owner: string) => owner.toLowerCase() !== ZERO_ADDRESS,
					).length,
				},
			};
		},
	);

	return {subscribe: store.subscribe, status: onchainState.status};
}
