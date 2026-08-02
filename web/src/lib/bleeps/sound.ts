import type {PublicClient} from 'viem';
import type {TypedDeployments} from '$lib/core/connection/types';
import {parseTokenURI} from '$lib/bleeps/metadata';

/**
 * A Bleep's own sound, as the contract renders it.
 *
 * `Bleeps.tokenURI` synthesises a WAV in Solidity and costs about 7.5M gas. That
 * is fine over `eth_call` (see docs/adr/0002-melobleeps-tokenuri-gas.md) but it
 * is not instant, which is why playing a Bleep is a CLICK rather than a hover:
 * there is a real wait the first time, and a hover that took a second to make a
 * sound would feel broken.
 *
 * Once fetched, a Bleep's sound never changes: the contract renders it from the
 * token id alone, with no state in it. So it is cached for the life of the page
 * and the second play is immediate.
 */
export type BleepSound = {
	id: number;
	name: string;
	image: string;
	animationUrl: string;
};

/**
 * Keyed by the contract as well as the id, so a chain switch (or a redeployed
 * dev chain) cannot serve sounds rendered by a different contract.
 */
function cacheKey(deployments: TypedDeployments, id: number): string {
	return `${deployments.chain.id}:${deployments.contracts.Bleeps.address}:${id}`;
}

const sounds = new Map<string, BleepSound>();
const inFlight = new Map<string, Promise<BleepSound>>();

/** What is already in hand, for rendering without waiting on a promise. */
export function cachedBleepSound(
	deployments: TypedDeployments,
	id: number,
): BleepSound | undefined {
	return sounds.get(cacheKey(deployments, id));
}

/**
 * Fetch a Bleep's sound, at most once.
 *
 * Concurrent callers share one call: the grid can be clicked twice while the
 * first render is still in the node, and 7.5M gas is not something to ask for
 * twice. A failed fetch is not cached, so a retry is a retry.
 */
export function fetchBleepSound(params: {
	publicClient: PublicClient;
	deployments: TypedDeployments;
	id: number;
}): Promise<BleepSound> {
	const {publicClient, deployments, id} = params;
	const key = cacheKey(deployments, id);

	const cached = sounds.get(key);
	if (cached) {
		return Promise.resolve(cached);
	}
	const pending = inFlight.get(key);
	if (pending) {
		return pending;
	}

	const promise = publicClient
		.readContract({
			...deployments.contracts.Bleeps,
			functionName: 'tokenURI',
			args: [BigInt(id)],
		})
		.then((tokenURI) => {
			const metadata = parseTokenURI(tokenURI as string);
			const sound: BleepSound = {
				id,
				name: metadata.name,
				image: metadata.image,
				animationUrl: metadata.animation_url,
			};
			sounds.set(key, sound);
			return sound;
		})
		.finally(() => {
			inFlight.delete(key);
		});

	inFlight.set(key, promise);
	return promise;
}

/** Tests only: the cache is process-wide and would leak between them. */
export function clearBleepSoundCache(): void {
	sounds.clear();
	inFlight.clear();
}
