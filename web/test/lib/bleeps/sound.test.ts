import {beforeEach, describe, expect, it, vi} from 'vitest';
import {
	cachedBleepSound,
	clearBleepSoundCache,
	fetchBleepSound,
} from '$lib/bleeps/sound';
import type {PublicClient} from 'viem';
import type {TypedDeployments} from '$lib/core/connection/types';

const TOKEN_URI =
	'data:application/json,{"name":"NOISE%20D2","image":"data:image/svg+xml;utf8,<svg/>","animation_url":"data:audio/wav;base64,AAAA"}';

function deploymentsOn(chainId: number, address: string) {
	return {
		chain: {id: chainId},
		contracts: {Bleeps: {address, abi: []}},
	} as unknown as TypedDeployments;
}

const deployments = deploymentsOn(31337, '0xbleeps');

function clientReturning(readContract: ReturnType<typeof vi.fn>): PublicClient {
	return {readContract} as unknown as PublicClient;
}

beforeEach(() => clearBleepSoundCache());

describe('fetchBleepSound', () => {
	it('decodes the percent-encoded name Bleeps returns', async () => {
		const readContract = vi.fn().mockResolvedValue(TOKEN_URI);
		const sound = await fetchBleepSound({
			publicClient: clientReturning(readContract),
			deployments,
			id: 5,
		});
		expect(sound.name).toEqual('NOISE D2');
		expect(sound.animationUrl).toEqual('data:audio/wav;base64,AAAA');
	});

	it('renders a Bleep once, however often it is asked for', async () => {
		// tokenURI costs about 7.5M gas; asking twice for a value that cannot
		// change is the one thing to avoid here
		const readContract = vi.fn().mockResolvedValue(TOKEN_URI);
		const publicClient = clientReturning(readContract);

		await fetchBleepSound({publicClient, deployments, id: 5});
		await fetchBleepSound({publicClient, deployments, id: 5});

		expect(readContract).toHaveBeenCalledTimes(1);
		expect(cachedBleepSound(deployments, 5)?.name).toEqual('NOISE D2');
	});

	it('shares one call between clicks that overlap', async () => {
		const readContract = vi.fn().mockResolvedValue(TOKEN_URI);
		const publicClient = clientReturning(readContract);

		const [first, second] = await Promise.all([
			fetchBleepSound({publicClient, deployments, id: 7}),
			fetchBleepSound({publicClient, deployments, id: 7}),
		]);

		expect(readContract).toHaveBeenCalledTimes(1);
		expect(first).toBe(second);
	});

	it('does not cache a failure, so a retry is a retry', async () => {
		const readContract = vi
			.fn()
			.mockRejectedValueOnce(new Error('rpc is having a moment'))
			.mockResolvedValue(TOKEN_URI);
		const publicClient = clientReturning(readContract);

		await expect(
			fetchBleepSound({publicClient, deployments, id: 9}),
		).rejects.toThrow('rpc is having a moment');
		const sound = await fetchBleepSound({publicClient, deployments, id: 9});
		expect(sound.name).toEqual('NOISE D2');
	});

	it('does not serve a sound rendered by another contract', async () => {
		// a redeployed dev chain keeps the same chain id and the same token ids
		const readContract = vi.fn().mockResolvedValue(TOKEN_URI);
		const publicClient = clientReturning(readContract);

		await fetchBleepSound({publicClient, deployments, id: 1});
		expect(
			cachedBleepSound(deploymentsOn(31337, '0xother'), 1),
		).toBeUndefined();
	});
});
