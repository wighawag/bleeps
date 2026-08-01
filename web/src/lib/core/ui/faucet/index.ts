import {PUBLIC_FAUCET_LINK, PUBLIC_FAUCET_API} from '$env/static/public';
import {deployments} from '$lib/deployments-store';

export {default as FaucetButton} from './FaucetButton.svelte';
export const hasFaucetLink = Boolean(
	PUBLIC_FAUCET_LINK && PUBLIC_FAUCET_LINK.trim(),
);
export const hasFaucetApi = Boolean(
	PUBLIC_FAUCET_API && PUBLIC_FAUCET_API.trim(),
);
export const hasFaucet = hasFaucetLink || hasFaucetApi;

export function getFaucetLink(address: `0x${string}`) {
	const separator = PUBLIC_FAUCET_LINK.includes('?') ? '&' : '?';
	return `${PUBLIC_FAUCET_LINK}${separator}chainId=${deployments.get().chain.id}&address=${address}`;
}
